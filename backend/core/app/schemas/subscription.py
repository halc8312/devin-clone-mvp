from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, validator

from app.models.subscription import SubscriptionStatus, PaymentStatus


class PriceProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: int = Field(..., gt=0)
    currency: str = Field(default="usd", max_length=3)
    interval: str = Field(..., pattern="^(month|year)$")
    interval_count: int = Field(default=1, ge=1)
    features: List[str] = []


class PriceProductCreate(PriceProductBase):
    stripe_price_id: str
    stripe_product_id: str
    metadata: Optional[Dict[str, Any]] = None


class PriceProduct(PriceProductBase):
    id: UUID
    stripe_price_id: str
    stripe_product_id: str
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class SubscriptionBase(BaseModel):
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    trial_end: Optional[datetime] = None


class SubscriptionCreate(SubscriptionBase):
    stripe_subscription_id: str
    stripe_price_id: str
    stripe_product_id: str


class SubscriptionUpdate(BaseModel):
    status: Optional[SubscriptionStatus] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None


class Subscription(SubscriptionBase):
    id: UUID
    user_id: UUID
    stripe_subscription_id: str
    stripe_price_id: str
    stripe_product_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PaymentBase(BaseModel):
    amount: int = Field(..., gt=0)
    currency: str = Field(default="usd", max_length=3)
    status: PaymentStatus
    description: Optional[str] = None


class PaymentCreate(PaymentBase):
    stripe_payment_intent_id: str
    stripe_invoice_id: Optional[str] = None
    subscription_id: Optional[UUID] = None


class Payment(PaymentBase):
    id: UUID
    user_id: UUID
    subscription_id: Optional[UUID]
    stripe_payment_intent_id: str
    stripe_invoice_id: Optional[str]
    invoice_pdf: Optional[str]
    receipt_url: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PaymentList(BaseModel):
    payments: List[Payment]
    total: int
    page: int
    page_size: int


class CreateCheckoutSessionRequest(BaseModel):
    price_id: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CreateCheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class CreatePortalSessionRequest(BaseModel):
    return_url: Optional[str] = None


class CreatePortalSessionResponse(BaseModel):
    portal_url: str


class WebhookEventBase(BaseModel):
    stripe_event_id: str
    event_type: str
    data: Dict[str, Any]


class WebhookEvent(WebhookEventBase):
    id: UUID
    processed: bool
    error: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SubscriptionInfo(BaseModel):
    """Combined subscription info for frontend"""
    has_subscription: bool
    subscription: Optional[Subscription] = None
    current_plan: str  # "free" or "pro"
    can_upgrade: bool
    usage: Dict[str, Any]  # Current usage stats