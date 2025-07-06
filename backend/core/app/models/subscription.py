from sqlalchemy import (
    Column,
    String,
    Text,
    ForeignKey,
    DateTime,
    Boolean,
    Integer,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.session import Base


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REFUNDED = "refunded"


class Subscription(Base):
    """User subscription details"""

    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # Stripe IDs
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    stripe_price_id = Column(String(255), nullable=False)
    stripe_product_id = Column(String(255), nullable=False)

    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), nullable=False)
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    cancel_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="subscription")


class Payment(Base):
    """Payment history"""

    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Stripe IDs
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=False)
    stripe_invoice_id = Column(String(255), unique=True, nullable=True)

    # Payment details
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="usd", nullable=False)
    status = Column(SQLEnum(PaymentStatus), nullable=False)
    description = Column(Text, nullable=True)

    # Invoice details
    invoice_pdf = Column(String(500), nullable=True)
    receipt_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription")


class PriceProduct(Base):
    """Available price/product combinations"""

    __tablename__ = "price_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Stripe IDs
    stripe_price_id = Column(String(255), unique=True, nullable=False)
    stripe_product_id = Column(String(255), nullable=False)

    # Product details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Price details
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="usd", nullable=False)
    interval = Column(String(10), nullable=False)  # month, year
    interval_count = Column(Integer, default=1, nullable=False)

    # Features
    features = Column(JSON, nullable=False, default=list)
    product_metadata = Column(JSON, nullable=True)

    # Status
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )


class WebhookEvent(Base):
    """Stripe webhook events for idempotency"""

    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stripe_event_id = Column(String(255), unique=True, nullable=False)
    event_type = Column(String(100), nullable=False)

    # Event data
    data = Column(JSON, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    error = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    processed_at = Column(DateTime(timezone=True), nullable=True)
