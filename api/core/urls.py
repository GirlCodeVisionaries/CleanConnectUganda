from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    path('hello/', views.hello, name='hello'),

    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/profile/', views.profile, name='profile'),

    path('services/', views.service_categories, name='service_categories'),

    path('partners/', views.partners_list, name='partners_list'),
    path('partners/onboard/', views.partner_onboard, name='partner_onboard'),
    path('partners/me/', views.partner_me, name='partner_me'),
    path('partners/me/documents/', views.partner_me_documents, name='partner_me_documents'),
    path('partners/me/documents/<int:pk>/', views.partner_me_document_detail, name='partner_me_document_detail'),
    path('partners/me/earnings/', views.partner_me_earnings, name='partner_me_earnings'),
    path('partners/me/payouts/', views.partner_me_payouts, name='partner_me_payouts'),
    path('partners/<int:pk>/', views.partner_detail, name='partner_detail'),
    path('partners/<int:partner_pk>/services/', views.partner_services, name='partner_services'),

    path('bookings/', views.bookings_list, name='bookings_list'),
    path('bookings/<int:pk>/', views.booking_detail, name='booking_detail'),

    path('payments/', views.payment_create, name='payment_create'),

    path('reviews/', views.reviews_list, name='reviews_list'),

    path('ai/quote/', views.ai_quote, name='ai_quote'),
    path('ai/match/', views.ai_match, name='ai_match'),
    path('ai/assign/', views.ai_auto_assign_view, name='ai_auto_assign'),
    path('ai/forecast/', views.ai_forecast, name='ai_forecast'),
    path('ai/chat/', views.ai_chat, name='ai_chat'),
    path('ai/trust-score/<int:partner_pk>/', views.ai_trust_score, name='ai_trust_score'),

    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),

    # ---- Platform admin (requires is_staff) ----
    path('admin/overview/', admin_views.overview, name='admin_overview'),
    path('admin/partners/', admin_views.partners, name='admin_partners'),
    path('admin/partners/<int:pk>/', admin_views.partner_detail, name='admin_partner_detail'),
    path('admin/partners/<int:pk>/verification/', admin_views.partner_verification, name='admin_partner_verification'),
    path('admin/partners/<int:pk>/payout/', admin_views.partner_payout, name='admin_partner_payout'),
    path('admin/documents/', admin_views.documents, name='admin_documents'),
    path('admin/documents/<int:pk>/review/', admin_views.document_review, name='admin_document_review'),
    path('admin/bookings/', admin_views.bookings, name='admin_bookings'),
    path('admin/bookings/<int:pk>/', admin_views.booking_detail, name='admin_booking_detail'),
    path('admin/bookings/<int:pk>/status/', admin_views.booking_status, name='admin_booking_status'),
    path('admin/payments/', admin_views.payments, name='admin_payments'),
    path('admin/payments/<int:pk>/refund/', admin_views.payment_refund, name='admin_payment_refund'),
    path('admin/payouts/', admin_views.payouts, name='admin_payouts'),
    path('admin/payouts/<int:pk>/retry/', admin_views.payout_retry, name='admin_payout_retry'),
    path('admin/users/', admin_views.users, name='admin_users'),
    path('admin/users/<int:pk>/', admin_views.user_detail, name='admin_user_detail'),
    path('admin/users/<int:pk>/active/', admin_views.user_set_active, name='admin_user_active'),
    path('admin/users/<int:pk>/role/', admin_views.user_set_role, name='admin_user_role'),
    path('admin/categories/', admin_views.categories, name='admin_categories'),
    path('admin/categories/<int:pk>/', admin_views.category_detail, name='admin_category_detail'),
    path('admin/activity/', admin_views.activity, name='admin_activity'),
]
