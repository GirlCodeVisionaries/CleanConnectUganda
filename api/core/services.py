"""Partner-portal domain logic: earnings ledger, verification gating, payouts.

Kept separate from views so it can be reused by the API, the admin, the
seed script and tests.
"""
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    Partner, PartnerDocument, PartnerEarning, Payout,
    required_document_types,
)
from .payments import get_payout_provider

TWO_PLACES = Decimal('0.01')


def _q(amount):
    return Decimal(str(amount)).quantize(TWO_PLACES)


# --------------------------------------------------------------------------- #
# Earnings ledger
# --------------------------------------------------------------------------- #
def record_earning_for_payment(payment):
    """Create (or update) the ledger line for a completed booking payment.

    Idempotent: safe to call more than once for the same booking.
    """
    booking = payment.booking
    partner = booking.partner

    gross = _q(payment.amount or booking.total_price)
    rate = _q(partner.commission_rate)
    commission = _q(booking.commission_amount) if booking.commission_amount else _q(gross * rate / Decimal('100'))
    net = _q(booking.partner_payout) if booking.partner_payout else _q(gross - commission)

    existing = PartnerEarning.objects.filter(booking=booking).first()
    # Once settled, a line is immutable.
    if existing and existing.status == 'paid':
        return existing

    new_status = 'available' if booking.status == 'completed' else 'pending'
    if existing and existing.status == 'available':
        new_status = 'available'  # don't regress an available line back to pending

    earning, _created = PartnerEarning.objects.update_or_create(
        booking=booking,
        defaults={
            'partner': partner,
            'payment': payment,
            'gross_amount': gross,
            'commission_rate': rate,
            'commission_amount': commission,
            'net_amount': net,
            'status': new_status,
        },
    )
    return earning


def mark_booking_earning_available(booking):
    """Flip a pending earning to 'available' once the job is completed."""
    PartnerEarning.objects.filter(booking=booking, status='pending').update(
        status='available', updated_at=timezone.now()
    )


def earnings_summary(partner):
    qs = PartnerEarning.objects.filter(partner=partner)

    def _sum(rows, field):
        return _q(rows.aggregate(v=Sum(field))['v'] or 0)

    available = qs.filter(status='available')
    pending = qs.filter(status='pending')
    paid = qs.filter(status='paid')

    return {
        'lifetime_gross': _sum(qs, 'gross_amount'),
        'lifetime_commission': _sum(qs, 'commission_amount'),
        'lifetime_net': _sum(qs, 'net_amount'),
        'available_balance': _sum(available, 'net_amount'),
        'pending_balance': _sum(pending, 'net_amount'),
        'paid_out': _sum(paid, 'net_amount'),
        'commission_rate': _q(partner.commission_rate),
        'total_jobs': qs.count(),
        'payout_minimum': Decimal(str(settings.PAYOUT_MINIMUM_AMOUNT)),
    }


# --------------------------------------------------------------------------- #
# Verification gating
# --------------------------------------------------------------------------- #
def document_verification_state(partner):
    required = required_document_types(partner.is_individual)
    approved = set(
        partner.documents.filter(status='approved').values_list('doc_type', flat=True)
    )
    missing = [d for d in required if d not in approved]
    return {
        'required_documents': required,
        'approved_documents': sorted(approved),
        'missing_documents': missing,
        'documents_complete': not missing,
    }


def has_required_documents_approved(partner):
    return document_verification_state(partner)['documents_complete']


def refresh_partner_verification(partner):
    """Promote a pending partner to 'verified' once required docs are approved;
    demote a verified partner back to 'pending' if that stops being true.

    Only acts on partners who have entered the document flow (at least one
    document on file) so legacy / manually-verified partners are left alone.
    Never touches 'rejected' or 'suspended' partners.
    """
    if partner.verification_status not in ('pending', 'verified'):
        return partner
    if not partner.documents.exists():
        return partner
    complete = has_required_documents_approved(partner)
    new_status = 'verified' if complete else 'pending'
    if new_status != partner.verification_status:
        partner.verification_status = new_status
        partner.save(update_fields=['verification_status', 'updated_at'])
    return partner


def review_document(document, *, approve, reviewer=None, notes=''):
    document.status = 'approved' if approve else 'rejected'
    document.review_notes = notes
    document.reviewed_by = reviewer
    document.reviewed_at = timezone.now()
    document.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])
    refresh_partner_verification(document.partner)
    return document


# --------------------------------------------------------------------------- #
# Payouts
# --------------------------------------------------------------------------- #
class PayoutError(Exception):
    pass


@transaction.atomic
def request_payout(partner, *, method, destination, requested_by=None):
    """Bundle all 'available' earnings into a Payout and push it through the
    configured disbursement provider."""
    if partner.payouts.filter(status__in=('pending', 'processing')).exists():
        raise PayoutError('You already have a payout in progress.')

    earnings = list(
        PartnerEarning.objects.select_for_update()
        .filter(partner=partner, status='available')
    )
    if not earnings:
        raise PayoutError('No earnings are available for payout yet.')

    amount = _q(sum(e.net_amount for e in earnings))
    minimum = Decimal(str(settings.PAYOUT_MINIMUM_AMOUNT))
    if amount < minimum:
        raise PayoutError(
            f'Minimum payout is UGX {minimum:,.0f}. Your available balance is UGX {amount:,.0f}.'
        )

    payout = Payout.objects.create(
        partner=partner,
        amount=amount,
        method=method,
        destination=destination,
        status='processing',
        requested_by=requested_by,
    )

    result = get_payout_provider().send(payout=payout)

    payout.status = result.get('status', 'processing')
    payout.reference = result.get('reference', '')
    payout.failure_reason = result.get('failure_reason', '')
    payout.provider_response = result.get('raw')
    if payout.status in ('paid', 'failed'):
        payout.processed_at = timezone.now()
    payout.save()

    if payout.status == 'paid':
        earning_ids = [e.id for e in earnings]
        PartnerEarning.objects.filter(id__in=earning_ids).update(
            status='paid', payout=payout, updated_at=timezone.now()
        )
    elif payout.status == 'failed':
        raise PayoutError(payout.failure_reason or 'Payout failed at the provider.')

    return payout


@transaction.atomic
def retry_payout(payout):
    """Re-run a failed payout through the provider."""
    if payout.status not in ('failed', 'processing'):
        raise PayoutError(f'Only failed payouts can be retried (this one is {payout.status}).')

    payout.status = 'processing'
    payout.failure_reason = ''
    payout.save(update_fields=['status', 'failure_reason'])

    result = get_payout_provider().send(payout=payout)
    payout.status = result.get('status', 'processing')
    payout.reference = result.get('reference', '') or payout.reference
    payout.failure_reason = result.get('failure_reason', '')
    payout.provider_response = result.get('raw')
    if payout.status in ('paid', 'failed'):
        payout.processed_at = timezone.now()
    payout.save()

    if payout.status == 'paid':
        # Settle the earnings that were bundled into this payout, plus any
        # 'available' lines that were left unlinked when it first failed.
        PartnerEarning.objects.filter(payout=payout).update(
            status='paid', updated_at=timezone.now()
        )
        PartnerEarning.objects.filter(partner=payout.partner, status='available', payout__isnull=True).update(
            status='paid', payout=payout, updated_at=timezone.now()
        )
    return payout
