import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.payment import Wallet, Payment, WalletTransaction


class WalletRepository(BaseRepository[Wallet]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Wallet, session)

    async def get_by_user_id(self, user_id: uuid.UUID, for_update: bool = False) -> Optional[Wallet]:
        """Fetches a user's wallet record with optional pessimistic FOR UPDATE lock."""
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.execute(stmt)
        return result.scalars().first()


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(Payment, session)

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[Payment]:
        stmt = select(Payment).where(Payment.idempotency_key == idempotency_key)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_transaction_id(self, transaction_id: str) -> Optional[Payment]:
        """Fetches a payment record by its external transaction ID."""
        stmt = select(Payment).where(Payment.transaction_id == transaction_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()


class WalletTransactionRepository(BaseRepository[WalletTransaction]):
    def __init__(self, *args, **kwargs) -> None:
        session = args[1] if len(args) >= 2 else (args[0] if len(args) == 1 else kwargs.get("session"))
        super().__init__(WalletTransaction, session)

    async def get_wallet_history(self, wallet_id: uuid.UUID) -> List[WalletTransaction]:
        """Fetches the wallet transaction ledger entries."""
        stmt = select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet_id
        ).order_by(WalletTransaction.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
