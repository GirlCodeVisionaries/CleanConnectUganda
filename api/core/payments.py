"""Pluggable payment + payout providers.

Call sites (see core/services.py and core/views.py) only ever touch the
``get_payment_provider()`` / ``get_payout_provider()`` helpers and the small
interface below, so a real gateway can be dropped in by:

  1. subclassing ``PaymentProvider`` / ``DisbursementProvider``
  2. pointing ``PAYMENT_PROVIDER`` / ``PAYOUT_PROVIDER`` in settings at it

The default implementations simulate success so the app is fully usable in
development without external credentials.
"""
import uuid

from django.conf import settings
from django.utils import timezone
from django.utils.module_loading import import_string


# --------------------------------------------------------------------------- #
# Interfaces
# --------------------------------------------------------------------------- #
class PaymentProvider:
    """Collects money FROM a customer for a booking."""

    def charge(self, *, booking, method, phone_number=''):
        """Return a dict: {status, transaction_id, raw}.

        ``status`` is one of: completed, processing, failed.
        """
        raise NotImplementedError


class DisbursementProvider:
    """Sends money TO a partner (payout)."""

    def send(self, *, payout):
        """Return a dict: {status, reference, raw, failure_reason}.

        ``status`` is one of: paid, processing, failed.
        """
        raise NotImplementedError


# --------------------------------------------------------------------------- #
# Simulated defaults
# --------------------------------------------------------------------------- #
class SimulatedPaymentProvider(PaymentProvider):
    def charge(self, *, booking, method, phone_number=''):
        return {
            'status': 'completed',
            'transaction_id': f"TXN-{uuid.uuid4().hex[:12].upper()}",
            'raw': {
                'simulated': True,
                'method': method,
                'phone_number': phone_number,
                'amount': str(booking.total_price),
                'processed_at': timezone.now().isoformat(),
            },
        }


class SimulatedDisbursementProvider(DisbursementProvider):
    def send(self, *, payout):
        return {
            'status': 'paid',
            'reference': f"PO-{uuid.uuid4().hex[:12].upper()}",
            'failure_reason': '',
            'raw': {
                'simulated': True,
                'method': payout.method,
                'destination': payout.destination,
                'amount': str(payout.amount),
                'processed_at': timezone.now().isoformat(),
            },
        }


# --------------------------------------------------------------------------- #
# Resolution
# --------------------------------------------------------------------------- #
def get_payment_provider():
    return import_string(settings.PAYMENT_PROVIDER)()


def get_payout_provider():
    return import_string(settings.PAYOUT_PROVIDER)()
