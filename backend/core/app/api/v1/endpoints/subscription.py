from typing import Any, List
from datetime import datetime, timezone
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import stripe

from app.api import deps
from app.db.session import get_db
from app.models import User, Subscription, Payment, PriceProduct, WebhookEvent, SubscriptionPlan, SubscriptionStatus, PaymentStatus
from app.schemas.subscription import (
    Subscription as SubscriptionSchema,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionInfo,
    Payment as PaymentSchema,
    PaymentList,
    PriceProduct as PriceProductSchema,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionRequest,
    CreatePortalSessionResponse,
)
from app.core.stripe_client import stripe_client
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/prices", response_model=List[PriceProductSchema])
async def list_available_prices(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List available subscription prices
    """
    result = await db.execute(
        select(PriceProduct)
        .where(PriceProduct.active == True)
        .order_by(PriceProduct.amount)
    )
    prices = result.scalars().all()
    
    return prices


@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription_info(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's subscription information
    """
    # Get subscription
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    # Calculate usage
    usage = {
        "projects": len(current_user.projects),
        "max_projects": 1 if current_user.subscription_plan == SubscriptionPlan.FREE else -1,
        "tokens_used": current_user.tokens_used,
        "tokens_limit": current_user.tokens_limit,
        "storage_used_mb": sum(p.total_size_kb for p in current_user.projects) / 1024,
        "storage_limit_mb": 10 if current_user.subscription_plan == SubscriptionPlan.FREE else 1024,
    }
    
    return SubscriptionInfo(
        has_subscription=subscription is not None,
        subscription=subscription,
        current_plan=current_user.subscription_plan.value,
        can_upgrade=current_user.subscription_plan == SubscriptionPlan.FREE,
        usage=usage
    )


@router.post("/checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    *,
    db: AsyncSession = Depends(get_db),
    checkout_request: CreateCheckoutSessionRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a Stripe checkout session for subscription
    """
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support."
        )
    # Check if user already has active subscription
    existing_sub = await db.execute(
        select(Subscription)
        .where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE
            )
        )
    )
    if existing_sub.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription"
        )
    
    # Verify price exists
    price_result = await db.execute(
        select(PriceProduct)
        .where(
            and_(
                PriceProduct.stripe_price_id == checkout_request.price_id,
                PriceProduct.active == True
            )
        )
    )
    price = price_result.scalar_one_or_none()
    
    if not price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid price ID"
        )
    
    # Create or get Stripe customer
    if not current_user.stripe_customer_id:
        try:
            customer = stripe_client.create_customer(
                email=current_user.email,
                name=current_user.full_name,
                metadata={
                    "user_id": str(current_user.id),
                    "username": current_user.username
                }
            )
            current_user.stripe_customer_id = customer.id
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to create Stripe customer: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create customer"
            )
    
    # Create checkout session
    try:
        success_url = checkout_request.success_url or f"{settings.FRONTEND_URL}/settings/billing?success=true"
        cancel_url = checkout_request.cancel_url or f"{settings.FRONTEND_URL}/settings/billing"
        
        session = stripe_client.create_checkout_session(
            customer_id=current_user.stripe_customer_id,
            price_id=checkout_request.price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "price_id": checkout_request.price_id
            }
        )
        
        return CreateCheckoutSessionResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except Exception as e:
        logger.error(f"Failed to create checkout session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/portal", response_model=CreatePortalSessionResponse)
async def create_portal_session(
    *,
    db: AsyncSession = Depends(get_db),
    portal_request: CreatePortalSessionRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a Stripe customer portal session for subscription management
    """
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support."
        )
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No customer account found"
        )
    
    try:
        return_url = portal_request.return_url or f"{settings.FRONTEND_URL}/settings/billing"
        
        session = stripe_client.create_portal_session(
            customer_id=current_user.stripe_customer_id,
            return_url=return_url
        )
        
        return CreatePortalSessionResponse(portal_url=session.url)
        
    except Exception as e:
        logger.error(f"Failed to create portal session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session"
        )


@router.post("/cancel")
async def cancel_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Cancel current subscription at period end
    """
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support."
        )
    # Get active subscription
    result = await db.execute(
        select(Subscription)
        .where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE
            )
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    try:
        # Cancel in Stripe
        stripe_sub = stripe_client.cancel_subscription(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update local subscription
        subscription.cancel_at = datetime.fromtimestamp(stripe_sub.cancel_at, tz=timezone.utc)
        subscription.canceled_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        return {"message": "Subscription will be canceled at the end of the billing period"}
        
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.post("/reactivate")
async def reactivate_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Reactivate a canceled subscription
    """
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support."
        )
    # Get canceled subscription
    result = await db.execute(
        select(Subscription)
        .where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.cancel_at.isnot(None)
            )
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No canceled subscription found"
        )
    
    try:
        # Reactivate in Stripe
        stripe_sub = stripe_client.reactivate_subscription(
            subscription.stripe_subscription_id
        )
        
        # Update local subscription
        subscription.cancel_at = None
        subscription.canceled_at = None
        
        await db.commit()
        
        return {"message": "Subscription has been reactivated"}
        
    except Exception as e:
        logger.error(f"Failed to reactivate subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reactivate subscription"
        )


@router.get("/payments", response_model=PaymentList)
async def list_payments(
    *,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List user's payment history
    """
    # Calculate offset
    skip = (page - 1) * page_size
    
    # Get total count
    count_result = await db.execute(
        select(func.count(Payment.id))
        .where(Payment.user_id == current_user.id)
    )
    total = count_result.scalar_one()
    
    # Get payments
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == current_user.id)
        .offset(skip)
        .limit(page_size)
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()
    
    return PaymentList(
        payments=payments,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Handle Stripe webhook events
    """
    # Check if Stripe is configured
    if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY == "" or not settings.STRIPE_WEBHOOK_SECRET or settings.STRIPE_WEBHOOK_SECRET == "":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support."
        )
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    
    try:
        # Construct and verify webhook event
        event = stripe_client.construct_webhook_event(payload, sig_header)
        
        # Check if we've already processed this event
        existing_event = await db.execute(
            select(WebhookEvent)
            .where(WebhookEvent.stripe_event_id == event.id)
        )
        if existing_event.scalar_one_or_none():
            return {"message": "Event already processed"}
        
        # Store event
        webhook_event = WebhookEvent(
            stripe_event_id=event.id,
            event_type=event.type,
            data=event.data.object
        )
        db.add(webhook_event)
        
        # Process event
        try:
            if event.type == "checkout.session.completed":
                await handle_checkout_completed(db, event.data.object)
            
            elif event.type == "customer.subscription.created":
                await handle_subscription_created(db, event.data.object)
            
            elif event.type == "customer.subscription.updated":
                await handle_subscription_updated(db, event.data.object)
            
            elif event.type == "customer.subscription.deleted":
                await handle_subscription_deleted(db, event.data.object)
            
            elif event.type == "invoice.payment_succeeded":
                await handle_payment_succeeded(db, event.data.object)
            
            elif event.type == "invoice.payment_failed":
                await handle_payment_failed(db, event.data.object)
            
            # Mark as processed
            webhook_event.processed = True
            webhook_event.processed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            logger.error(f"Failed to process webhook event {event.id}: {str(e)}")
            webhook_event.error = str(e)
            
        await db.commit()
        return {"message": "Webhook processed"}
        
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing error"
        )


async def handle_checkout_completed(db: AsyncSession, session: dict):
    """Handle successful checkout"""
    logger.info(f"Processing checkout.session.completed: {session['id']}")
    
    # Get user from metadata
    user_id = session["metadata"].get("user_id")
    if not user_id:
        logger.error("No user_id in checkout session metadata")
        return
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User {user_id} not found")
        return
    
    # Update subscription ID if present
    if session.get("subscription"):
        user.stripe_subscription_id = session["subscription"]
        user.subscription_plan = SubscriptionPlan.PRO


async def handle_subscription_created(db: AsyncSession, subscription: dict):
    """Handle new subscription creation"""
    logger.info(f"Processing customer.subscription.created: {subscription['id']}")
    
    # Get user by customer ID
    result = await db.execute(
        select(User).where(User.stripe_customer_id == subscription["customer"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User with customer_id {subscription['customer']} not found")
        return
    
    # Create subscription record
    sub = Subscription(
        user_id=user.id,
        stripe_subscription_id=subscription["id"],
        stripe_price_id=subscription["items"]["data"][0]["price"]["id"],
        stripe_product_id=subscription["items"]["data"][0]["price"]["product"],
        status=stripe_client.map_subscription_status(subscription["status"]),
        current_period_start=datetime.fromtimestamp(subscription["current_period_start"], tz=timezone.utc),
        current_period_end=datetime.fromtimestamp(subscription["current_period_end"], tz=timezone.utc),
        trial_end=datetime.fromtimestamp(subscription["trial_end"], tz=timezone.utc) if subscription.get("trial_end") else None,
    )
    db.add(sub)
    
    # Update user
    user.subscription_plan = SubscriptionPlan.PRO
    user.stripe_subscription_id = subscription["id"]


async def handle_subscription_updated(db: AsyncSession, subscription: dict):
    """Handle subscription updates"""
    logger.info(f"Processing customer.subscription.updated: {subscription['id']}")
    
    # Get subscription
    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_subscription_id == subscription["id"])
    )
    sub = result.scalar_one_or_none()
    
    if not sub:
        logger.error(f"Subscription {subscription['id']} not found")
        return
    
    # Update subscription
    sub.status = stripe_client.map_subscription_status(subscription["status"])
    sub.current_period_start = datetime.fromtimestamp(subscription["current_period_start"], tz=timezone.utc)
    sub.current_period_end = datetime.fromtimestamp(subscription["current_period_end"], tz=timezone.utc)
    
    if subscription.get("cancel_at"):
        sub.cancel_at = datetime.fromtimestamp(subscription["cancel_at"], tz=timezone.utc)
    else:
        sub.cancel_at = None
        
    if subscription.get("canceled_at"):
        sub.canceled_at = datetime.fromtimestamp(subscription["canceled_at"], tz=timezone.utc)
    else:
        sub.canceled_at = None


async def handle_subscription_deleted(db: AsyncSession, subscription: dict):
    """Handle subscription deletion"""
    logger.info(f"Processing customer.subscription.deleted: {subscription['id']}")
    
    # Get subscription
    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_subscription_id == subscription["id"])
    )
    sub = result.scalar_one_or_none()
    
    if not sub:
        logger.error(f"Subscription {subscription['id']} not found")
        return
    
    # Update subscription status
    sub.status = SubscriptionStatus.CANCELED
    
    # Update user
    user_result = await db.execute(
        select(User).where(User.id == sub.user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if user:
        user.subscription_plan = SubscriptionPlan.FREE
        user.stripe_subscription_id = None


async def handle_payment_succeeded(db: AsyncSession, invoice: dict):
    """Handle successful payment"""
    logger.info(f"Processing invoice.payment_succeeded: {invoice['id']}")
    
    # Get user by customer ID
    result = await db.execute(
        select(User).where(User.stripe_customer_id == invoice["customer"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        logger.error(f"User with customer_id {invoice['customer']} not found")
        return
    
    # Get subscription if exists
    sub_result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_subscription_id == invoice.get("subscription"))
    )
    subscription = sub_result.scalar_one_or_none()
    
    # Create payment record
    payment = Payment(
        user_id=user.id,
        subscription_id=subscription.id if subscription else None,
        stripe_payment_intent_id=invoice["payment_intent"],
        stripe_invoice_id=invoice["id"],
        amount=invoice["amount_paid"],
        currency=invoice["currency"],
        status=PaymentStatus.SUCCEEDED,
        description=f"Subscription payment for {invoice['period_start']} - {invoice['period_end']}",
        invoice_pdf=invoice.get("invoice_pdf"),
        receipt_url=invoice.get("hosted_invoice_url"),
        paid_at=datetime.now(timezone.utc)
    )
    db.add(payment)


async def handle_payment_failed(db: AsyncSession, invoice: dict):
    """Handle failed payment"""
    logger.info(f"Processing invoice.payment_failed: {invoice['id']}")
    
    # Similar to payment succeeded but with FAILED status
    # Implementation omitted for brevity