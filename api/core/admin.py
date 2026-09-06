from django.contrib import admin
from .models import (
    User, ServiceCategory, Partner, PartnerService, PartnerAvailability,
    Booking, Payment, Review, AIQuoteRequest, ChatMessage, DemandForecast,
    PartnerDocument, PartnerEarning, Payout, AdminActionLog,
)
from . import services


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


class PartnerDocumentInline(admin.TabularInline):
    model = PartnerDocument
    extra = 0
    fields = ['doc_type', 'file', 'status', 'review_notes', 'uploaded_at', 'reviewed_by']
    readonly_fields = ['uploaded_at']


PartnerAdmin.inlines = [PartnerDocumentInline]


@admin.register(PartnerDocument)
class PartnerDocumentAdmin(admin.ModelAdmin):
    list_display = ['partner', 'doc_type', 'status', 'uploaded_at', 'reviewed_at', 'reviewed_by']
    list_filter = ['status', 'doc_type']
    search_fields = ['partner__business_name', 'partner__user__username']
    readonly_fields = ['uploaded_at', 'original_name']
    actions = ['approve_documents', 'reject_documents']

    @admin.action(description='Approve selected documents (re-checks partner verification)')
    def approve_documents(self, request, queryset):
        for doc in queryset:
            services.review_document(doc, approve=True, reviewer=request.user)
        self.message_user(request, f'{queryset.count()} document(s) approved.')

    @admin.action(description='Reject selected documents')
    def reject_documents(self, request, queryset):
        for doc in queryset:
            services.review_document(doc, approve=False, reviewer=request.user,
                                     notes=doc.review_notes or 'Rejected by admin.')
        self.message_user(request, f'{queryset.count()} document(s) rejected.')


@admin.register(PartnerEarning)
class PartnerEarningAdmin(admin.ModelAdmin):
    list_display = ['partner', 'booking', 'gross_amount', 'commission_amount', 'net_amount', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['partner__business_name', 'booking__booking_ref']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ['partner', 'amount', 'method', 'status', 'reference', 'created_at', 'processed_at']
    list_filter = ['status', 'method']
    search_fields = ['partner__business_name', 'reference']
    readonly_fields = ['created_at', 'processed_at', 'provider_response']


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'actor', 'action', 'target_type', 'target_id', 'summary']
    list_filter = ['action', 'target_type']
    search_fields = ['actor__username', 'summary', 'target_id']
    readonly_fields = ['actor', 'action', 'target_type', 'target_id', 'summary', 'detail',
                       'ip_address', 'created_at']

    def has_add_permission(self, request):
        return False
