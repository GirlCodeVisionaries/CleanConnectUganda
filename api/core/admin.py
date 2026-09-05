from django.contrib import admin
from .models import (
    User, ServiceCategory, Partner, PartnerService, PartnerAvailability,
    Booking, Payment, Review, AIQuoteRequest, ChatMessage, DemandForecast
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'phone', 'location']
    list_filter = ['role']
    search_fields = ['username', 'email', 'phone']


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'base_price', 'is_active']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'verification_status', 'avg_rating', 'total_bookings', 'is_featured']
    list_filter = ['verification_status', 'is_featured', 'is_individual']
    search_fields = ['business_name', 'user__username']


@admin.register(PartnerService)
class PartnerServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'partner', 'category', 'base_price', 'is_available']
    list_filter = ['is_available', 'category']


@admin.register(PartnerAvailability)
class PartnerAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['partner', 'day_of_week', 'start_time', 'end_time', 'is_available']
    list_filter = ['day_of_week', 'is_available']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_ref', 'customer', 'partner', 'status', 'total_price', 'scheduled_date']
    list_filter = ['status', 'scheduled_date']
    search_fields = ['booking_ref', 'customer__username', 'partner__business_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'booking', 'method', 'amount', 'status', 'created_at']
    list_filter = ['status', 'method']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['customer', 'partner', 'rating', 'is_verified', 'created_at']
    list_filter = ['rating', 'is_verified']


@admin.register(AIQuoteRequest)
class AIQuoteRequestAdmin(admin.ModelAdmin):
    list_display = ['customer', 'location', 'service_type', 'predicted_price', 'created_at']
    list_filter = ['service_type', 'urgency']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'role', 'content', 'created_at']
    list_filter = ['role']


@admin.register(DemandForecast)
class DemandForecastAdmin(admin.ModelAdmin):
    list_display = ['location', 'service_type', 'date', 'predicted_demand', 'suggested_price_multiplier']
    list_filter = ['service_type']
