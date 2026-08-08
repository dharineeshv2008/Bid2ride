from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.payment import (
    WalletResponse,
    WalletBalanceResponse,
    WalletHistoryResponse,
    WalletTopUpRequest,
    WalletWithdrawRequest,
)
from app.services.payment_service import WalletService
from app.repositories.payment_repository import WalletTransactionRepository

router = APIRouter()


@router.get("", response_model=WalletResponse)
async def get_wallet_details(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves current user's wallet details."""
    wallet_service = WalletService(db)
    wallet = await wallet_service.get_wallet(current_user.id)
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "balance": float(wallet.balance),
        "currency": wallet.currency,
        "updated_at": wallet.updated_at
    }


@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves current user's wallet balance amount."""
    wallet_service = WalletService(db)
    wallet = await wallet_service.get_wallet(current_user.id)
    return {
        "balance": float(wallet.balance),
        "currency": wallet.currency
    }


@router.get("/history", response_model=WalletHistoryResponse)
async def get_wallet_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieves paginated wallet ledger transaction logs."""
    wallet_service = WalletService(db)
    wallet = await wallet_service.get_wallet(current_user.id)

    ledger_repo = WalletTransactionRepository(db)
    
    # Total count
    filters = {"wallet_id": wallet.id}
    total = await ledger_repo.count(filters=filters)

    transactions = await ledger_repo.get_multi(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by="created_at",
        sort_desc=True
    )

    items_response = []
    for tx in transactions:
        items_response.append({
            "id": tx.id,
            "wallet_id": tx.wallet_id,
            "amount": float(tx.amount),
            "type": tx.type,
            "transaction_purpose": tx.transaction_purpose,
            "payment_id": tx.payment_id,
            "created_at": tx.created_at
        })

    return {"total_count": total, "items": items_response}


@router.post("/topup", response_model=WalletResponse, status_code=status.HTTP_200_OK)
async def topup_wallet_balance(
    payload: WalletTopUpRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Deposits funds into user's wallet, appending a credit audit log entry."""
    wallet_service = WalletService(db)
    wallet = await wallet_service.topup_balance(current_user.id, payload.amount)
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "balance": float(wallet.balance),
        "currency": wallet.currency,
        "updated_at": wallet.updated_at
    }


@router.post("/withdraw", response_model=WalletResponse, status_code=status.HTTP_200_OK)
async def withdraw_wallet_balance(
    payload: WalletWithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Executes pessimistic SELECT FOR UPDATE balance validation and registers a CASH_OUT withdrawal transaction."""
    wallet_service = WalletService(db)
    wallet = await wallet_service.withdraw_balance(
        user_id=current_user.id,
        amount=payload.amount,
        details=payload.account_details
    )
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "balance": float(wallet.balance),
        "currency": wallet.currency,
        "updated_at": wallet.updated_at
    }

