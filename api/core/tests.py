import io
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import (
    Partner, ServiceCategory, PartnerService, Booking, Payment,
    PartnerDocument, PartnerEarning, Payout, AdminActionLog,
)
from . import services

User = get_user_model()


def _token_for(user):
    from rest_framework.authtoken.models import Token
    return 'Token ' + Token.objects.get_or_create(user=user)[0].key


def _pdf(name='doc.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4 fake', content_type='application/pdf')


class PartnerPortalTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cleaner1', password='pass12345', role='customer')
        self.client.credentials(HTTP_AUTHORIZATION=self._token(self.user))

    def _token(self, user):
        from rest_framework.authtoken.models import Token
        return 'Token ' + Token.objects.get_or_create(user=user)[0].key

    def test_onboarding_creates_partner_and_sets_role(self):
        res = self.client.post('/api/partners/onboard/', {
            'business_name': 'Shiny Co', 'business_description': 'We clean',
            'is_individual': True, 'coverage_radius_km': 12, 'phone': '+256700000000',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'partner')
        self.assertTrue(Partner.objects.filter(user=self.user).exists())
        self.assertIn('onboarding_complete', res.data)
        self.assertFalse(res.data['onboarding_complete']['documents'])

    def test_document_upload_and_verification_gate(self):
        self.client.post('/api/partners/onboard/', {
            'business_name': 'Shiny Co', 'is_individual': True,
        }, format='json')
        partner = Partner.objects.get(user=self.user)
        self.assertEqual(partner.verification_status, 'pending')

        res = self.client.post('/api/partners/me/documents/',
                               {'doc_type': 'national_id', 'file': _pdf()}, format='multipart')
        self.assertEqual(res.status_code, 201, res.content)
        doc = PartnerDocument.objects.get(partner=partner)
        self.assertEqual(doc.status, 'pending')

        partner.refresh_from_db()
        self.assertEqual(partner.verification_status, 'pending')  # not yet approved

        services.review_document(doc, approve=True)
        partner.refresh_from_db()
        self.assertEqual(partner.verification_status, 'verified')  # auto-promoted

    def test_payment_records_earning_and_payout_flow(self):
        self.client.post('/api/partners/onboard/', {'business_name': 'Shiny Co', 'is_individual': True}, format='json')
        partner = Partner.objects.get(user=self.user)
        partner.verification_status = 'verified'
        partner.commission_rate = Decimal('20.00')
        partner.save()

        customer = User.objects.create_user(username='buyer', password='pass12345', role='customer')
        cat = ServiceCategory.objects.create(name='Deep', slug='deep', base_price=50000)
        svc = PartnerService.objects.create(partner=partner, category=cat, name='Deep', base_price=50000)
        booking = Booking.objects.create(
            customer=customer, partner=partner, service=svc, service_category=cat,
            address='x', scheduled_date=date.today() + timedelta(days=1), scheduled_time='09:00',
            total_price=Decimal('100000'), commission_amount=Decimal('20000'),
            partner_payout=Decimal('80000'),
        )

        self.client.credentials(HTTP_AUTHORIZATION=self._token(customer))
        res = self.client.post('/api/payments/', {
            'booking': booking.id, 'method': 'mtn_momo', 'phone_number': '+256700000000',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)

        earning = PartnerEarning.objects.get(booking=booking)
        self.assertEqual(earning.net_amount, Decimal('80000.00'))
        self.assertEqual(earning.commission_amount, Decimal('20000.00'))
        self.assertEqual(earning.status, 'pending')

        # Complete the job -> earning becomes available
        booking.status = 'completed'
        booking.save()
        services.mark_booking_earning_available(booking)
        earning.refresh_from_db()
        self.assertEqual(earning.status, 'available')

        # Partner requests payout
        self.client.credentials(HTTP_AUTHORIZATION=self._token(self.user))
        res = self.client.post('/api/partners/me/payouts/', {
            'method': 'mtn_momo', 'destination': '+256700000000',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data['status'], 'paid')

        earning.refresh_from_db()
        self.assertEqual(earning.status, 'paid')

        res = self.client.get('/api/partners/me/earnings/')
        self.assertEqual(Decimal(res.data['summary']['paid_out']), Decimal('80000.00'))
        self.assertEqual(Decimal(res.data['summary']['available_balance']), Decimal('0.00'))

    def test_non_partner_blocked_from_portal(self):
        outsider = User.objects.create_user(username='rando', password='pass12345', role='customer')
        self.client.credentials(HTTP_AUTHORIZATION=self._token(outsider))
        res = self.client.get('/api/partners/me/earnings/')
        self.assertEqual(res.status_code, 403)


class AdminPortalTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='boss', password='pass12345', role='admin', is_staff=True,
        )
        self.customer = User.objects.create_user(username='cust', password='pass12345', role='customer')
        pu = User.objects.create_user(username='pcleaner', password='pass12345', role='partner')
        self.partner = Partner.objects.create(user=pu, business_name='Mop Co', is_individual=True)
        self.cat = ServiceCategory.objects.create(name='Deep', slug='deep', base_price=50000)
        self.svc = PartnerService.objects.create(partner=self.partner, category=self.cat, name='Deep', base_price=50000)
        self.booking = Booking.objects.create(
            customer=self.customer, partner=self.partner, service=self.svc, service_category=self.cat,
            address='x', scheduled_date=date.today() + timedelta(days=1), scheduled_time='09:00',
            total_price=Decimal('100000'), commission_amount=Decimal('18000'), partner_payout=Decimal('82000'),
        )
        self.client.credentials(HTTP_AUTHORIZATION=_token_for(self.admin))

    def test_requires_staff(self):
        self.client.credentials(HTTP_AUTHORIZATION=_token_for(self.customer))
        self.assertEqual(self.client.get('/api/admin/overview/').status_code, 403)

    def test_overview_shapes(self):
        res = self.client.get('/api/admin/overview/')
        self.assertEqual(res.status_code, 200, res.content)
        for key in ('partners', 'users', 'bookings', 'money', 'payouts', 'queues', 'recent_activity'):
            self.assertIn(key, res.data)

    def test_partner_verification_is_logged(self):
        res = self.client.post(f'/api/admin/partners/{self.partner.id}/verification/',
                               {'status': 'verified', 'notes': 'looks good'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.verification_status, 'verified')
        self.assertTrue(AdminActionLog.objects.filter(
            action='partner.verification', actor=self.admin).exists())

    def test_partner_commission_update(self):
        res = self.client.patch(f'/api/admin/partners/{self.partner.id}/',
                                {'commission_rate': '25.00', 'is_featured': True}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.partner.refresh_from_db()
        self.assertEqual(str(self.partner.commission_rate), '25.00')
        self.assertTrue(self.partner.is_featured)

    def test_document_review_flow(self):
        doc = PartnerDocument.objects.create(
            partner=self.partner, doc_type='national_id',
            file=SimpleUploadedFile('id.pdf', b'%PDF', content_type='application/pdf'),
        )
        res = self.client.get('/api/admin/documents/?status=pending')
        self.assertEqual(res.data['count'], 1)
        res = self.client.post(f'/api/admin/documents/{doc.id}/review/',
                               {'decision': 'approve', 'notes': 'ok'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.verification_status, 'verified')

    def test_booking_status_change(self):
        res = self.client.post(f'/api/admin/bookings/{self.booking.id}/status/',
                               {'status': 'completed', 'notes': 'manual close'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'completed')
        self.assertIsNotNone(self.booking.completed_at)

    def test_user_deactivate_guards(self):
        # cannot deactivate self
        res = self.client.post(f'/api/admin/users/{self.admin.id}/active/',
                               {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 400)
        # can deactivate a normal user
        res = self.client.post(f'/api/admin/users/{self.customer.id}/active/',
                               {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)

    def test_category_crud(self):
        res = self.client.post('/api/admin/categories/',
                               {'name': 'Carpet Clean', 'base_price': '40000'}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        cid = res.data['id']
        self.assertEqual(res.data['slug'], 'carpet-clean')
        res = self.client.patch(f'/api/admin/categories/{cid}/', {'base_price': '45000'}, format='json')
        self.assertEqual(res.status_code, 200)
        res = self.client.delete(f'/api/admin/categories/{cid}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(ServiceCategory.objects.get(pk=cid).is_active)

    def test_payout_retry(self):
        earning = PartnerEarning.objects.create(
            partner=self.partner, booking=self.booking, gross_amount=Decimal('100000'),
            commission_rate=Decimal('18'), commission_amount=Decimal('18000'),
            net_amount=Decimal('82000'), status='available',
        )
        payout = Payout.objects.create(
            partner=self.partner, amount=Decimal('82000'), method='mtn_momo',
            destination='+256700000000', status='failed', failure_reason='provider down',
        )
        earning.payout = payout
        earning.save()
        res = self.client.post(f'/api/admin/payouts/{payout.id}/retry/', format='json')
        self.assertEqual(res.status_code, 200, res.content)
        payout.refresh_from_db()
        self.assertEqual(payout.status, 'paid')
        earning.refresh_from_db()
        self.assertEqual(earning.status, 'paid')
