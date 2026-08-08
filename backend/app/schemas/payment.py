import uuid
import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class WalletResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    balance: float
    currency: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class WalletBalanceResponse(BaseModel):
    balance: float
    currency: str = "INR"


class WalletTransactionResponse(BaseModel):
    id: uuid.UUID
    wallet_id: uuid.UUID
    amount: float
    type: str  # CREDIT, DEBIT
    transaction_purpose: str  # RIDE_EARNING, TOPUP, CASH_OUT, COMMISSION
    payment_id: Optional[uuid.UUID] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class WalletHistoryResponse(BaseModel):
    total_count: int
    items: List[WalletTransactionResponse]


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., ge=5.00, description="Top-up minimum is ₹5.00")


class WalletWithdrawRequest(BaseModel):
    amount: float = Field(..., ge=10.00, description="Minimum withdrawal is ₹10.00")
    account_details: Optional[str] = None



class RidePaymentRequest(BaseModel):
    idempotency_key: str = Field(..., min_length=10, max_length=100)


class RidePaymentResponse(BaseModel):
    payment_id: uuid.UUID
    amount: float
    commission_fee: float
    status: str
    method: str
    transaction_id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    payment_id: uuid.UUID
    reason: str = Field(..., min_length=5, max_length=255)
    idempotency_key: str = Field(..., min_length=10, max_length=100)


class RefundResponse(BaseModel):
    status: str
    refunded_payment_id: uuid.UUID
    amount_refunded: float
    created_at: datetime.datetime


class PaymentResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    amount: float
    commission_fee: float
    status: str
    method: str
    transaction_id: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    total_count: int
    items: List[PaymentResponse]


class InvoiceResponse(BaseModel):
    payment_id: uuid.UUID
    ride_id: uuid.UUID
    passenger_name: str
    driver_name: str
    amount: float
    commission_fee: float
    status: str
    created_at: datetime.datetime
