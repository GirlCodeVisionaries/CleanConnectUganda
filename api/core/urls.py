from django.urls import path
from . import views

urlpatterns = [
    path('hello/', views.hello, name='hello'),

    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/profile/', views.profile, name='profile'),

    path('services/', views.service_categories, name='service_categories'),

    path('partners/', views.partners_list, name='partners_list'),
    path('partners/<int:pk>/', views.partner_detail, name='partner_detail'),
    path('partners/<int:partner_pk>/services/', views.partner_services, name='partner_services'),

    path('bookings/', views.bookings_list, name='bookings_list'),
    path('bookings/<int:pk>/', views.booking_detail, name='booking_detail'),

    path('payments/', views.payment_create, name='payment_create'),

    path('reviews/', views.reviews_list, name='reviews_list'),

    path('ai/quote/', views.ai_quote, name='ai_quote'),
    path('ai/match/', views.ai_match, name='ai_match'),
    path('ai/forecast/', views.ai_forecast, name='ai_forecast'),
    path('ai/chat/', views.ai_chat, name='ai_chat'),
    path('ai/trust-score/<int:partner_pk>/', views.ai_trust_score, name='ai_trust_score'),

    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
]
