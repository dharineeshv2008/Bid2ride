import uuid
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, ValidationException, InsufficientWalletBalanceException
from app.services.base import BaseService
from app.models.payment import Wallet, Payment, WalletTransaction
from app.repositories.payment_repository import WalletRepository, PaymentRepository, WalletTransactionRepository


class WalletService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = WalletRepository(session)
        self.ledger_repo = WalletTransactionRepository(session)

    async def get_wallet(self, user_id: uuid.UUID) -> Wallet:
        wallet = await self.repo.get_by_user_id(user_id)
        if not wallet:
            raise EntityNotFoundException("Wallet profile not found for this user")
        return wallet

    async def topup_balance(self, user_id: uuid.UUID, amount: float) -> Wallet:
        if amount <= 0:
            raise ValidationException("Top-up amount must be greater than zero")

        wallet = await self.get_wallet(user_id)
        wallet.balance = float(wallet.balance) + float(amount)

        # Write credit ledger transaction
        await self.ledger_repo.create({
            "wallet_id": wallet.id,
            "amount": amount,
            "type": "CREDIT",
            "transaction_purpose": "TOPUP"
        })

        await self.commit()
        return wallet


class PaymentService(BaseService):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.repo = PaymentRepository(session)
        self.wallet_repo = WalletRepository(session)
        self.ledger_repo = WalletTransactionRepository(session)

    async def settle_ride_payment(
        self,
        assignment_id: uuid.UUID,
        passenger_user_id: uuid.UUID,
        driver_user_id: uuid.UUID,
        amount: float,
        commission_rate: float = 0.15
    ) -> Tuple[Payment, Wallet, Wallet]:
        """Settles ride charges. Deducts balance from passenger wallet, credits driver wallet minus commission."""
        passenger_wallet = await self.wallet_repo.get_by_user_id(passenger_user_id)
        driver_wallet = await self.wallet_repo.get_by_user_id(driver_user_id)

        if not passenger_wallet or not driver_wallet:
            raise EntityNotFoundException("Passenger or Driver wallet not initialized")

        # Check balance
        if float(passenger_wallet.balance) < float(amount):
            raise InsufficientWalletBalanceException("Insufficient wallet balance to cover trip charges")

        commission = float(amount) * commission_rate
        driver_payout = float(amount) - commission

        # Update Passenger Wallet
        passenger_wallet.balance = float(passenger_wallet.balance) - float(amount)
        # Update Driver Wallet
        driver_wallet.balance = float(driver_wallet.balance) + driver_payout

        # Record Payment
        payment = await self.repo.create({
            "assignment_id": assignment_id,
            "amount": amount,
            "commission_fee": commission,
            "status": "COMPLETED",
            "method": "WALLET",
            "transaction_id": f"TXN-BID-{uuid.uuid4().hex[:12].upper()}"
        })
        await self.session.flush()  # Populates payment.id

        # Write passenger debit ledger
        await self.ledger_repo.create({
            "wallet_id": passenger_wallet.id,
            "amount": amount,
            "type": "DEBIT",
            "transaction_purpose": "DEBIT",
            "payment_id": payment.id
        })

        # Write driver credit ledger
        await self.ledger_repo.create({
            "wallet_id": driver_wallet.id,
            "amount": driver_payout,
            "type": "CREDIT",
            "transaction_purpose": "RIDE_EARNING",
            "payment_id": payment.id
        })

        # Write system commission ledger (deducted from driver flow)
        await self.ledger_repo.create({
            "wallet_id": driver_wallet.id,
            "amount": commission,
            "type": "DEBIT",
            "transaction_purpose": "COMMISSION",
            "payment_id": payment.id
        })

        await self.commit()
        return payment, passenger_wallet, driver_wallet
