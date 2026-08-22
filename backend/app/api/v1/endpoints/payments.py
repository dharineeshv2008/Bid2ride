import uuid
import datetime
from typing import List, Tuple
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    PermissionDeniedException,
    EntityNotFoundException,
    ValidationException,
)
from app.core.redis import redis_manager
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.ride import RideAssignment, RideRequest
from app.models.payment import Payment, Wallet, WalletTransaction
from app.schemas.payment import (
    RidePaymentRequest,
    RidePaymentResponse,
    PaymentResponse,
    PaymentHistoryResponse,
    RefundRequest,
    RefundResponse,
)
from app.services.payment_service import PaymentService
from app.repositories.payment_repository import PaymentRepository

router = APIRouter()


# =====================================================================
# PAYMENT SETTLEMENT ENDPOINTS
# =====================================================================

@router.post("/rides/{ride_id}", response_model=RidePaymentResponse, status_code=status.HTTP_201_CREATED)
async def settle_ride_payment_endpoint(
    ride_id: uuid.UUID,  # ride_id corresponds to assignment_id in workflow
    payload: RidePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    # 1. Acquire Redis distributed idempotency lock
    lock_key = f"payment_lock:{payload.idempotency_key}"
    acquired = True
    if redis_manager.client:
        try:
            acquired = await redis_manager.client.set(lock_key, "locked", ex=30, nx=True)
        except Exception:
            acquired = True
    if not acquired:
        raise ValidationException("Concurrent payment settlement request in progress. Please retry.")

    try:
        # 2. Retrieve assignment details
        stmt = select(RideAssignment).where(RideAssignment.id == ride_id)
        assignment = (await db.execute(stmt)).scalars().first()
        if not assignment:
            raise EntityNotFoundException("Ride assignment details not found")

        # 3. Ownership & State checks
        ride_stmt = select(RideRequest).where(RideRequest.id == assignment.request_id)
        ride = (await db.execute(ride_stmt)).scalars().first()
        if not ride or ride.passenger_id != current_user.id:
            raise PermissionDeniedException("Access denied. Current user does not own this ride request.")

        if assignment.status != "COMPLETED":
            raise ValidationException("Trip payment is only eligible for settlement after ride completion")

        # 4. Check duplicate payments (idempotency check)
        pay_stmt = select(Payment).where(Payment.assignment_id == assignment.id, Payment.status == "COMPLETED")
        existing_payment = (await db.execute(pay_stmt)).scalars().first()
        if existing_payment:
            return {
                "payment_id": existing_payment.id,
                "amount": float(existing_payment.amount),
                "commission_fee": float(existing_payment.commission_fee),
                "status": existing_payment.status,
                "method": existing_payment.method,
                "transaction_id": existing_payment.transaction_id,
                "created_at": existing_payment.created_at
            }

        # 5. Execute settlement
        payment_service = PaymentService(db)
        payment, _, _ = await payment_service.settle_ride_payment(
            assignment_id=assignment.id,
            passenger_user_id=current_user.id,
            driver_user_id=assignment.driver_id,
            amount=float(assignment.price_charged)
        )

        return {
            "payment_id": payment.id,
            "amount": float(payment.amount),
            "commission_fee": float(payment.commission_fee),
            "status": payment.status,
            "method": payment.method,
            "transaction_id": payment.transaction_id,
            "created_at": payment.created_at
        }
    finally:
        # Release lock
        if redis_manager.client:
            try:
                await redis_manager.client.delete(lock_key)
            except Exception:
                pass


@router.get("/history", response_model=PaymentHistoryResponse)
async def get_payments_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves paginated historical settled payments list for the user."""
    try:
        if current_user.role == "PASSENGER":
            stmt = (
                select(Payment)
                .join(RideAssignment, Payment.assignment_id == RideAssignment.id)
                .join(RideRequest, RideAssignment.request_id == RideRequest.id)
                .where(RideRequest.passenger_id == current_user.id)
            )
        else:
            stmt = (
                select(Payment)
                .join(RideAssignment, Payment.assignment_id == RideAssignment.id)
                .where(RideAssignment.driver_id == current_user.id)
            )

        result = await db.execute(stmt.order_by(Payment.created_at.desc()))
        all_payments = result.scalars().all()

        total = len(all_payments)
        paginated_payments = all_payments[skip : skip + limit]

        items = []
        for p in paginated_payments:
            items.append({
                "id": p.id,
                "assignment_id": p.assignment_id,
                "amount": float(p.amount),
                "commission_fee": float(p.commission_fee),
                "status": p.status,
                "method": p.method,
                "transaction_id": p.transaction_id,
                "created_at": p.created_at
            })

        return {"total_count": total, "items": items}
    except Exception:
        return {"total_count": 0, "items": []}


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment_details(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves detailed billing invoice logs for a transaction."""
    repo = PaymentRepository(Payment, db)
    payment = await repo.get(payment_id)
    if not payment:
        raise EntityNotFoundException("Payment record not found")

    # Access control: verify user is passenger or driver participant
    stmt = select(RideAssignment).where(RideAssignment.id == payment.assignment_id)
    assignment = (await db.execute(stmt)).scalars().first()

    ride_stmt = select(RideRequest).where(RideRequest.id == assignment.request_id)
    ride = (await db.execute(ride_stmt)).scalars().first()

    if current_user.id != assignment.driver_id and current_user.id != ride.passenger_id:
        raise PermissionDeniedException("Access denied. User does not own this transaction.")

    return {
        "id": payment.id,
        "assignment_id": payment.assignment_id,
        "amount": float(payment.amount),
        "commission_fee": float(payment.commission_fee),
        "status": payment.status,
        "method": payment.method,
        "transaction_id": payment.transaction_id,
        "created_at": payment.created_at
    }


# =====================================================================
# REFUND FLOW ENDPOINTS
# =====================================================================

@router.post("/refund", response_model=RefundResponse)
async def process_refund(
    payload: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Processes refunds by reversing transaction ledger records inside an atomic transaction."""
    # Enforce role restriction: refunds can only be triggered by admin/support users
    if current_user.role != "ADMIN" and current_user.role != "SUPPORT":
        raise PermissionDeniedException("Access denied. Administrator privileges required.")

    # Idempotency lock
    lock_key = f"refund_lock:{payload.idempotency_key}"
    acquired = True
    if redis_manager.client:
        try:
            acquired = await redis_manager.client.set(lock_key, "locked", ex=30, nx=True)
        except Exception:
            acquired = True
    if not acquired:
        raise ValidationException("Concurrent refund request in progress. Please retry.")

    try:
        repo = PaymentRepository(Payment, db)
        payment = await repo.get(payload.payment_id)
        
        if not payment:
            raise EntityNotFoundException("Payment record not found")

        if payment.status != "COMPLETED":
            raise ValidationException("Only completed payments are eligible for refunds")

        # 1. Load details
        stmt = select(RideAssignment).where(RideAssignment.id == payment.assignment_id)
        assignment = (await db.execute(stmt)).scalars().first()

        ride_stmt = select(RideRequest).where(RideRequest.id == assignment.request_id)
        ride = (await db.execute(ride_stmt)).scalars().first()

        # 2. Retrieve wallets
        pass_wallet_stmt = select(Wallet).where(Wallet.user_id == ride.passenger_id)
        passenger_wallet = (await db.execute(pass_wallet_stmt)).scalars().first()

        drv_wallet_stmt = select(Wallet).where(Wallet.user_id == assignment.driver_id)
        driver_wallet = (await db.execute(drv_wallet_stmt)).scalars().first()

        # 3. Perform refund reversals inside an atomic block
        payment.status = "REFUNDED"
        
        # Add payment value back to passenger
        passenger_wallet.balance = float(passenger_wallet.balance) + float(payment.amount)
        
        # Deduct payout value (original minus commission) from driver
        commission = float(payment.commission_fee)
        driver_payout = float(payment.amount) - commission
        driver_wallet.balance = float(driver_wallet.balance) - driver_payout

        # Log passenger credit refund transaction
        pass_tx = WalletTransaction(
            wallet_id=passenger_wallet.id,
            amount=payment.amount,
            type="CREDIT",
            transaction_purpose="TOPUP",
            payment_id=payment.id
        )
        db.add(pass_tx)

        # Log driver debit refund transaction
        drv_tx = WalletTransaction(
            wallet_id=driver_wallet.id,
            amount=driver_payout,
            type="DEBIT",
            transaction_purpose="CASH_OUT",
            payment_id=payment.id
        )
        db.add(drv_tx)

        # Log commission reversal debit transaction
        comm_tx = WalletTransaction(
            wallet_id=driver_wallet.id,
            amount=commission,
            type="CREDIT",
            transaction_purpose="COMMISSION",
            payment_id=payment.id
        )
        db.add(comm_tx)

        await db.commit()

        return {
            "status": "success",
            "refunded_payment_id": payment.id,
            "amount_refunded": float(payment.amount),
            "created_at": datetime.datetime.utcnow()
        }
    finally:
        if redis_manager.client:
            try:
                await redis_manager.client.delete(lock_key)
            except Exception:
                pass
