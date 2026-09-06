"""Platform-admin API. All endpoints require request.user.is_staff.

Kept separate from core/views.py (the public/customer/partner API) so the
admin surface is easy to find and reason about. Mounted under /api/admin/.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from . import services
from .audit import log_admin_action
from .models import (
    Partner, PartnerDocument, PartnerEarning, Payout,
    Booking, Payment, ServiceCategory, AdminActionLog,
)
from .serializers import (
    AdminUserSerializer, AdminPartnerListSerializer, AdminPartnerDetailSerializer,
    AdminPartnerUpdateSerializer, PartnerVerificationSerializer,
    AdminDocumentSerializer, DocumentReviewSerializer,
    AdminBookingSerializer, BookingStatusSerializer,
    AdminPaymentSerializer, AdminPayoutSerializer, PayoutRequestSerializer,
    AdminCategorySerializer, UserActiveSerializer, UserRoleSerializer,
    AdminActionLogSerializer,
)

User = get_user_model()

ADMIN = [IsAdminUser]


def _page(request, queryset, serializer_class, **context):
    try:
        page_size = min(int(request.query_params.get('page_size', 25)), 200)
    except (TypeError, ValueError):
        page_size = 25
    try:
        page_number = max(int(request.query_params.get('page', 1)), 1)
    except (TypeError, ValueError):
        page_number = 1

    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number)
    context.setdefault('request', request)
    return Response({
        'results': serializer_class(page.object_list, many=True, context=context).data,
        'count': paginator.count,
        'page': page.number,
        'num_pages': paginator.num_pages,
        'page_size': page_size,
    })


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def overview(request):
    now = timezone.now()
    since = now - timedelta(days=30)

    partners_by_status = {
        row['verification_status']: row['n']
        for row in Partner.objects.values('verification_status').annotate(n=Count('id'))
    }
    bookings_by_status = {
        row['status']: row['n']
        for row in Booking.objects.values('status').annotate(n=Count('id'))
    }
    earning_totals = PartnerEarning.objects.aggregate(
        gmv=Sum('gross_amount'), commission=Sum('commission_amount'), net=Sum('net_amount'),
    )
    payout_totals = {
        row['status']: {'n': row['n'], 'amount': row['amount'] or Decimal('0')}
        for row in Payout.objects.values('status').annotate(n=Count('id'), amount=Sum('amount'))
    }

    return Response({
        'partners': {
            'total': Partner.objects.count(),
            'by_status': partners_by_status,
            'pending_verification': partners_by_status.get('pending', 0),
        },
        'users': {
            'total': User.objects.count(),
            'customers': User.objects.filter(role='customer').count(),
            'partners': User.objects.filter(role='partner').count(),
            'staff': User.objects.filter(is_staff=True).count(),
            'new_30d': User.objects.filter(date_joined__gte=since).count(),
        },
        'bookings': {
            'total': Booking.objects.count(),
            'by_status': bookings_by_status,
            'new_30d': Booking.objects.filter(created_at__gte=since).count(),
        },
        'money': {
            'gmv': earning_totals['gmv'] or 0,
            'commission_revenue': earning_totals['commission'] or 0,
            'partner_earnings': earning_totals['net'] or 0,
            'completed_booking_value': Booking.objects.filter(status='completed').aggregate(
                v=Sum('total_price'))['v'] or 0,
        },
        'payouts': {
            'pending': payout_totals.get('pending', {'n': 0, 'amount': 0}),
            'processing': payout_totals.get('processing', {'n': 0, 'amount': 0}),
            'paid': payout_totals.get('paid', {'n': 0, 'amount': 0}),
            'failed': payout_totals.get('failed', {'n': 0, 'amount': 0}),
        },
        'queues': {
            'pending_documents': PartnerDocument.objects.filter(status='pending').count(),
            'pending_partners': partners_by_status.get('pending', 0),
            'failed_payouts': payout_totals.get('failed', {'n': 0})['n'],
            'disputed_bookings': bookings_by_status.get('disputed', 0),
        },
        'recent_activity': AdminActionLogSerializer(
            AdminActionLog.objects.all()[:10], many=True,
        ).data,
    })


# --------------------------------------------------------------------------- #
# Partners
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def partners(request):
    qs = Partner.objects.select_related('user').prefetch_related('documents').order_by('-created_at')
    status_f = request.query_params.get('status')
    if status_f:
        qs = qs.filter(verification_status=status_f)
    if request.query_params.get('is_individual') in ('true', 'false'):
        qs = qs.filter(is_individual=request.query_params['is_individual'] == 'true')
    if request.query_params.get('featured') in ('true', 'false'):
        qs = qs.filter(is_featured=request.query_params['featured'] == 'true')
    search = request.query_params.get('search')
    if search:
        qs = qs.filter(
            Q(business_name__icontains=search) |
            Q(user__username__icontains=search) |
            Q(user__email__icontains=search)
        )
    return _page(request, qs, AdminPartnerListSerializer)


@api_view(['GET', 'PATCH'])
@permission_classes(ADMIN)
def partner_detail(request, pk):
    partner = Partner.objects.select_related('user').filter(pk=pk).first()
    if not partner:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminPartnerDetailSerializer(partner, context={'request': request}).data)

    serializer = AdminPartnerUpdateSerializer(partner, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    before = {f: str(getattr(partner, f)) for f in serializer.validated_data}
    serializer.save()
    partner.refresh_from_db()
    after = {f: str(getattr(partner, f)) for f in serializer.validated_data}
    log_admin_action(
        actor=request.user, action='partner.update', target=partner,
        summary=f'Updated {", ".join(serializer.validated_data)} for {partner.business_name}',
        detail={'before': before, 'after': after}, request=request,
    )
    return Response(AdminPartnerDetailSerializer(partner, context={'request': request}).data)


@api_view(['POST'])
@permission_classes(ADMIN)
def partner_verification(request, pk):
    partner = Partner.objects.filter(pk=pk).first()
    if not partner:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PartnerVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    old = partner.verification_status
    new = serializer.validated_data['status']
    partner.verification_status = new
    partner.save(update_fields=['verification_status', 'updated_at'])
    log_admin_action(
        actor=request.user, action='partner.verification', target=partner,
        summary=f'{partner.business_name}: {old} -> {new}',
        detail={'before': old, 'after': new, 'notes': serializer.validated_data['notes']},
        request=request,
    )
    return Response(AdminPartnerDetailSerializer(partner, context={'request': request}).data)


@api_view(['POST'])
@permission_classes(ADMIN)
def partner_payout(request, pk):
    partner = Partner.objects.filter(pk=pk).first()
    if not partner:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PayoutRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        payout = services.request_payout(
            partner,
            method=serializer.validated_data['method'],
            destination=serializer.validated_data['destination'],
            requested_by=request.user,
        )
    except services.PayoutError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    log_admin_action(
        actor=request.user, action='payout.create', target=payout,
        summary=f'Admin payout of UGX {payout.amount} to {partner.business_name} ({payout.status})',
        request=request,
    )
    return Response(AdminPayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


# --------------------------------------------------------------------------- #
# Documents
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def documents(request):
    qs = PartnerDocument.objects.select_related('partner', 'partner__user').order_by('-uploaded_at')
    status_f = request.query_params.get('status', 'pending')
    if status_f and status_f != 'all':
        qs = qs.filter(status=status_f)
    return _page(request, qs, AdminDocumentSerializer)


@api_view(['POST'])
@permission_classes(ADMIN)
def document_review(request, pk):
    doc = PartnerDocument.objects.select_related('partner').filter(pk=pk).first()
    if not doc:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DocumentReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    approve = serializer.validated_data['decision'] == 'approve'
    services.review_document(
        doc, approve=approve, reviewer=request.user, notes=serializer.validated_data['notes'],
    )
    doc.partner.refresh_from_db()
    log_admin_action(
        actor=request.user, action=f"document.{serializer.validated_data['decision']}", target=doc,
        summary=f'{doc.get_doc_type_display()} for {doc.partner.business_name} '
                f'{"approved" if approve else "rejected"}',
        detail={'partner_verification': doc.partner.verification_status,
                'notes': serializer.validated_data['notes']},
        request=request,
    )
    return Response({
        'document': AdminDocumentSerializer(doc, context={'request': request}).data,
        'partner_verification_status': doc.partner.verification_status,
    })


# --------------------------------------------------------------------------- #
# Bookings
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def bookings(request):
    qs = (Booking.objects.select_related('customer', 'partner', 'service')
          .select_related('payment').order_by('-created_at'))
    status_f = request.query_params.get('status')
    if status_f:
        qs = qs.filter(status=status_f)
    search = request.query_params.get('search')
    if search:
        qs = qs.filter(
            Q(booking_ref__icontains=search) |
            Q(customer__username__icontains=search) |
            Q(partner__business_name__icontains=search)
        )
    return _page(request, qs, AdminBookingSerializer)


@api_view(['GET'])
@permission_classes(ADMIN)
def booking_detail(request, pk):
    booking = (Booking.objects.select_related('customer', 'partner', 'service', 'payment')
               .filter(pk=pk).first())
    if not booking:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    data = AdminBookingSerializer(booking, context={'request': request}).data
    data['special_requests'] = booking.special_requests
    data['num_rooms'] = booking.num_rooms
    data['num_bathrooms'] = booking.num_bathrooms
    return Response(data)


@api_view(['POST'])
@permission_classes(ADMIN)
def booking_status(request, pk):
    booking = Booking.objects.select_related('partner').filter(pk=pk).first()
    if not booking:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BookingStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    old = booking.status
    new = serializer.validated_data['status']
    booking.status = new
    if new == 'completed' and not booking.completed_at:
        booking.completed_at = timezone.now()
        booking.partner.total_bookings += 1
        booking.partner.total_earnings += booking.partner_payout
        booking.partner.save()
    booking.save()
    if new == 'completed':
        services.mark_booking_earning_available(booking)

    log_admin_action(
        actor=request.user, action='booking.status', target=booking,
        summary=f'{booking.booking_ref}: {old} -> {new}',
        detail={'before': old, 'after': new, 'notes': serializer.validated_data['notes']},
        request=request,
    )
    return Response(AdminBookingSerializer(booking, context={'request': request}).data)


# --------------------------------------------------------------------------- #
# Payments
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def payments(request):
    qs = Payment.objects.select_related('booking', 'booking__customer', 'booking__partner').order_by('-created_at')
    status_f = request.query_params.get('status')
    if status_f:
        qs = qs.filter(status=status_f)
    method_f = request.query_params.get('method')
    if method_f:
        qs = qs.filter(method=method_f)
    search = request.query_params.get('search')
    if search:
        qs = qs.filter(
            Q(transaction_id__icontains=search) |
            Q(booking__booking_ref__icontains=search)
        )
    return _page(request, qs, AdminPaymentSerializer)


@api_view(['POST'])
@permission_classes(ADMIN)
def payment_refund(request, pk):
    payment = Payment.objects.select_related('booking').filter(pk=pk).first()
    if not payment:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
    if payment.status == 'refunded':
        return Response({'error': 'Payment is already refunded'}, status=status.HTTP_400_BAD_REQUEST)

    payment.status = 'refunded'
    payment.save(update_fields=['status'])
    booking = payment.booking
    booking.status = 'cancelled'
    booking.save(update_fields=['status'])
    # Void any earning that has not been paid out yet.
    PartnerEarning.objects.filter(booking=booking).exclude(status='paid').delete()

    log_admin_action(
        actor=request.user, action='payment.refund', target=payment,
        summary=f'Refunded {payment.amount} on {booking.booking_ref}; booking cancelled',
        request=request,
    )
    return Response(AdminPaymentSerializer(payment).data)


# --------------------------------------------------------------------------- #
# Payouts
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def payouts(request):
    qs = Payout.objects.select_related('partner', 'requested_by').order_by('-created_at')
    status_f = request.query_params.get('status')
    if status_f:
        qs = qs.filter(status=status_f)
    return _page(request, qs, AdminPayoutSerializer)


@api_view(['POST'])
@permission_classes(ADMIN)
def payout_retry(request, pk):
    payout = Payout.objects.filter(pk=pk).first()
    if not payout:
        return Response({'error': 'Payout not found'}, status=status.HTTP_404_NOT_FOUND)
    try:
        services.retry_payout(payout)
    except services.PayoutError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    log_admin_action(
        actor=request.user, action='payout.retry', target=payout,
        summary=f'Retried payout to {payout.partner.business_name} -> {payout.status}',
        request=request,
    )
    return Response(AdminPayoutSerializer(payout).data)


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def users(request):
    qs = User.objects.annotate(booking_count=Count('bookings')).order_by('-date_joined')
    role_f = request.query_params.get('role')
    if role_f:
        qs = qs.filter(role=role_f)
    if request.query_params.get('is_active') in ('true', 'false'):
        qs = qs.filter(is_active=request.query_params['is_active'] == 'true')
    search = request.query_params.get('search')
    if search:
        qs = qs.filter(
            Q(username__icontains=search) | Q(email__icontains=search) | Q(phone__icontains=search)
        )
    return _page(request, qs, AdminUserSerializer)


@api_view(['GET'])
@permission_classes(ADMIN)
def user_detail(request, pk):
    user = User.objects.annotate(booking_count=Count('bookings')).filter(pk=pk).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(AdminUserSerializer(user).data)


@api_view(['POST'])
@permission_classes(ADMIN)
def user_set_active(request, pk):
    user = User.objects.filter(pk=pk).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    if user.pk == request.user.pk:
        return Response({'error': 'You cannot change your own active status.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if user.is_superuser and not request.user.is_superuser:
        return Response({'error': 'Only a superuser can change another superuser.'},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = UserActiveSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user.is_active = serializer.validated_data['is_active']
    user.save(update_fields=['is_active'])
    log_admin_action(
        actor=request.user, action='user.set_active', target=user,
        summary=f'{user.username} {"activated" if user.is_active else "deactivated"}',
        request=request,
    )
    return Response(AdminUserSerializer(User.objects.annotate(
        booking_count=Count('bookings')).get(pk=user.pk)).data)


@api_view(['POST'])
@permission_classes(ADMIN)
def user_set_role(request, pk):
    user = User.objects.filter(pk=pk).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    if user.is_superuser and not request.user.is_superuser:
        return Response({'error': 'Only a superuser can change another superuser.'},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = UserRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    old = user.role
    user.role = serializer.validated_data['role']
    user.save(update_fields=['role'])
    log_admin_action(
        actor=request.user, action='user.set_role', target=user,
        summary=f'{user.username}: role {old} -> {user.role}',
        detail={'before': old, 'after': user.role}, request=request,
    )
    return Response(AdminUserSerializer(User.objects.annotate(
        booking_count=Count('bookings')).get(pk=user.pk)).data)


# --------------------------------------------------------------------------- #
# Service categories
# --------------------------------------------------------------------------- #
@api_view(['GET', 'POST'])
@permission_classes(ADMIN)
def categories(request):
    if request.method == 'GET':
        qs = ServiceCategory.objects.annotate(n=Count('partner_services')).order_by('name')
        return Response(AdminCategorySerializer(qs, many=True).data)

    serializer = AdminCategorySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    category = serializer.save()
    log_admin_action(
        actor=request.user, action='category.create', target=category,
        summary=f'Created category "{category.name}"', request=request,
    )
    return Response(AdminCategorySerializer(category).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes(ADMIN)
def category_detail(request, pk):
    category = ServiceCategory.objects.filter(pk=pk).first()
    if not category:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminCategorySerializer(category).data)

    if request.method == 'DELETE':
        # Soft-disable: hard delete would cascade to partner services.
        category.is_active = False
        category.save(update_fields=['is_active'])
        log_admin_action(
            actor=request.user, action='category.disable', target=category,
            summary=f'Disabled category "{category.name}"', request=request,
        )
        return Response({'id': category.id, 'is_active': False})

    serializer = AdminCategorySerializer(category, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    log_admin_action(
        actor=request.user, action='category.update', target=category,
        summary=f'Updated category "{category.name}"',
        detail={'fields': list(serializer.validated_data)}, request=request,
    )
    return Response(AdminCategorySerializer(category).data)


# --------------------------------------------------------------------------- #
# Activity log
# --------------------------------------------------------------------------- #
@api_view(['GET'])
@permission_classes(ADMIN)
def activity(request):
    qs = AdminActionLog.objects.select_related('actor').all()
    if request.query_params.get('action'):
        qs = qs.filter(action=request.query_params['action'])
    if request.query_params.get('target_type'):
        qs = qs.filter(target_type=request.query_params['target_type'])
    if request.query_params.get('actor'):
        qs = qs.filter(actor__username__icontains=request.query_params['actor'])
    return _page(request, qs, AdminActionLogSerializer)
