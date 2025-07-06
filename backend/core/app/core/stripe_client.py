"""
Stripe API client integration
"""
import stripe
from typing import Optional, Dict, Any, List
import logging

from app.core.config import settings
from app.models.subscription import SubscriptionStatus

logger = logging.getLogger(__name__)

# Initialize Stripe only if configured
if settings.STRIPE_SECRET_KEY and settings.STRIPE_SECRET_KEY != "":
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    logger.warning("Stripe is not configured. Payment features will be disabled.")
    stripe.api_key = None


class StripeClient:
    """Stripe API client wrapper"""

    @staticmethod
    def create_customer(
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> stripe.Customer:
        """Create a new Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email, name=name, metadata=metadata or {}
            )
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create customer: {str(e)}")
            raise

    @staticmethod
    def get_customer(customer_id: str) -> Optional[stripe.Customer]:
        """Get customer by ID"""
        try:
            return stripe.Customer.retrieve(customer_id)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get customer {customer_id}: {str(e)}")
            return None

    @staticmethod
    def update_customer(customer_id: str, **kwargs) -> stripe.Customer:
        """Update customer details"""
        try:
            return stripe.Customer.modify(customer_id, **kwargs)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update customer {customer_id}: {str(e)}")
            raise

    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        mode: str = "subscription",
        metadata: Optional[Dict[str, Any]] = None,
        allow_promotion_codes: bool = True,
    ) -> stripe.checkout.Session:
        """Create a checkout session for subscription"""
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode=mode,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata or {},
                allow_promotion_codes=allow_promotion_codes,
                billing_address_collection="required",
                customer_update={"address": "auto", "name": "auto"},
            )
            return session
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create checkout session: {str(e)}")
            raise

    @staticmethod
    def create_portal_session(
        customer_id: str, return_url: str
    ) -> stripe.billing_portal.Session:
        """Create customer portal session for subscription management"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id, return_url=return_url
            )
            return session
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create portal session: {str(e)}")
            raise

    @staticmethod
    def get_subscription(subscription_id: str) -> Optional[stripe.Subscription]:
        """Get subscription by ID"""
        try:
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get subscription {subscription_id}: {str(e)}")
            return None

    @staticmethod
    def cancel_subscription(
        subscription_id: str, cancel_at_period_end: bool = True
    ) -> stripe.Subscription:
        """Cancel a subscription"""
        try:
            if cancel_at_period_end:
                # Cancel at end of billing period
                return stripe.Subscription.modify(
                    subscription_id, cancel_at_period_end=True
                )
            else:
                # Cancel immediately
                return stripe.Subscription.delete(subscription_id)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {str(e)}")
            raise

    @staticmethod
    def reactivate_subscription(subscription_id: str) -> stripe.Subscription:
        """Reactivate a canceled subscription"""
        try:
            return stripe.Subscription.modify(
                subscription_id, cancel_at_period_end=False
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"Failed to reactivate subscription {subscription_id}: {str(e)}"
            )
            raise

    @staticmethod
    def list_prices(
        active: bool = True, product: Optional[str] = None, limit: int = 10
    ) -> List[stripe.Price]:
        """List available prices"""
        try:
            params = {"active": active, "limit": limit, "expand": ["data.product"]}
            if product:
                params["product"] = product

            prices = stripe.Price.list(**params)
            return prices.data
        except stripe.error.StripeError as e:
            logger.error(f"Failed to list prices: {str(e)}")
            raise

    @staticmethod
    def get_payment_intent(payment_intent_id: str) -> Optional[stripe.PaymentIntent]:
        """Get payment intent by ID"""
        try:
            return stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get payment intent {payment_intent_id}: {str(e)}")
            return None

    @staticmethod
    def list_invoices(
        customer_id: str, limit: int = 10, starting_after: Optional[str] = None
    ) -> List[stripe.Invoice]:
        """List customer invoices"""
        try:
            params = {"customer": customer_id, "limit": limit}
            if starting_after:
                params["starting_after"] = starting_after

            invoices = stripe.Invoice.list(**params)
            return invoices.data
        except stripe.error.StripeError as e:
            logger.error(f"Failed to list invoices for {customer_id}: {str(e)}")
            raise

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """Construct and verify webhook event"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise

    @staticmethod
    def map_subscription_status(stripe_status: str) -> SubscriptionStatus:
        """Map Stripe subscription status to our internal status"""
        status_map = {
            "active": SubscriptionStatus.ACTIVE,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELED,
            "unpaid": SubscriptionStatus.UNPAID,
            "trialing": SubscriptionStatus.TRIALING,
            "incomplete": SubscriptionStatus.INCOMPLETE,
            "incomplete_expired": SubscriptionStatus.INCOMPLETE_EXPIRED,
        }
        return status_map.get(stripe_status, SubscriptionStatus.CANCELED)


# Global instance
stripe_client = StripeClient()
