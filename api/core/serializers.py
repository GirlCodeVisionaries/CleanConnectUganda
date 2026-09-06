from django.conf import settings
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ServiceCategory, Partner, PartnerService, PartnerAvailability,
    Booking, Payment, Review, AIQuoteRequest, ChatMessage, DemandForecast,
    PartnerDocument, PartnerEarning, Payout, AdminActionLog,
)

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone', 'gender', 'role', 'location']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'gender', 'role', 'location', 'latitude', 'longitude',
                  'profile_image', 'is_staff', 'is_superuser', 'is_active']
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'is_active']


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = '__all__'


class PartnerServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = PartnerService
        fields = ['id', 'category', 'category_name', 'name', 'description', 'base_price',
                  'price_per_room', 'min_price', 'duration_minutes', 'is_available']


class PartnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    services = PartnerServiceSerializer(many=True, read_only=True)
    avg_rating_display = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = ['id', 'user', 'business_name', 'business_description', 'verification_status',
                  'avg_rating', 'avg_rating_display', 'total_bookings', 'total_earnings',
                  'coverage_radius_km', 'is_individual', 'commission_rate', 'is_featured',
                  'services', 'created_at']

    def get_avg_rating_display(self, obj):
        return f"{obj.avg_rating:.1f}"


class PartnerListSerializer(serializers.ModelSerializer):
    services = PartnerServiceSerializer(many=True, read_only=True)
    avg_rating_display = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = ['id', 'business_name', 'avg_rating', 'avg_rating_display',
                  'total_bookings', 'is_individual', 'is_featured', 'services']

    def get_avg_rating_display(self, obj):
        return f"{obj.avg_rating:.1f}"


class PartnerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = ['business_name', 'business_description', 'is_individual',
                  'coverage_radius_km', 'commission_rate']


class PartnerAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_available']


class BookingSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='partner.business_name', read_only=True)
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True, allow_null=True)
    partner_rating = serializers.CharField(source='partner.avg_rating_display', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'booking_ref', 'customer', 'customer_name', 'partner', 'partner_name',
                  'partner_rating', 'service', 'service_name', 'service_category',
                  'status', 'customer_gender', 'address', 'num_rooms', 'num_bathrooms', 'special_requests',
                  'scheduled_date', 'scheduled_time', 'duration_minutes',
                  'base_price', 'discount_percent', 'discount_amount', 'total_price',
                  'commission_amount', 'partner_payout',
                  'ai_match_data', 'created_at', 'completed_at']
        read_only_fields = ['booking_ref', 'commission_amount', 'partner_payout', 'created_at']


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['partner', 'service', 'service_category', 'customer_gender', 'address', 'latitude', 'longitude',
                  'num_rooms', 'num_bathrooms', 'special_requests',
                  'scheduled_date', 'scheduled_time', 'duration_minutes',
                  'base_price', 'discount_percent', 'discount_amount', 'total_price', 'ai_match_data']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'booking', 'method', 'amount', 'status', 'transaction_id',
                  'phone_number', 'created_at', 'completed_at']
        read_only_fields = ['transaction_id', 'created_at', 'completed_at']


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['booking', 'method', 'phone_number']


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    partner_name = serializers.CharField(source='partner.business_name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer', 'customer_name', 'partner', 'partner_name',
                  'rating', 'comment', 'is_verified', 'created_at']
        read_only_fields = ['customer', 'is_verified', 'created_at']


class AIQuoteRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIQuoteRequest
        fields = ['id', 'location', 'service_type', 'num_rooms', 'num_bathrooms',
                  'urgency', 'latitude', 'longitude', 'predicted_price', 'quotes_data', 'created_at']
        read_only_fields = ['predicted_price', 'quotes_data', 'created_at']


class AIQuoteInputSerializer(serializers.Serializer):
    location = serializers.CharField(max_length=255)
    service_type = serializers.CharField(max_length=100)
    num_rooms = serializers.IntegerField(default=1, min_value=1)
    num_bathrooms = serializers.IntegerField(default=1, min_value=0)
    urgency = serializers.ChoiceField(choices=['standard', 'urgent', 'scheduled'], default='standard')
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=['male', 'female', 'other', ''], default='', required=False)


class AIAutoAssignInputSerializer(serializers.Serializer):
    location = serializers.CharField(max_length=255)
    service_type = serializers.CharField(max_length=100)
    num_rooms = serializers.IntegerField(default=1, min_value=1)
    num_bathrooms = serializers.IntegerField(default=1, min_value=0)
    urgency = serializers.ChoiceField(choices=['standard', 'urgent', 'scheduled'], default='standard')
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=['male', 'female', 'other', ''], default='', required=False)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'session_id', 'role', 'content', 'metadata', 'created_at']


class ChatInputSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=50)
    message = serializers.CharField()


class DemandForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandForecast
        fields = '__all__'


# ---------------------------------------------------------------------------
# Partner portal
# ---------------------------------------------------------------------------

class PartnerOnboardingSerializer(serializers.ModelSerializer):
    """Create or update the calling user's own Partner profile."""
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    location = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Partner
        fields = ['business_name', 'business_description', 'is_individual',
                  'coverage_radius_km', 'phone', 'location']

    def _sync_user(self, user, validated_data):
        phone = validated_data.pop('phone', None)
        location = validated_data.pop('location', None)
        changed = []
        if phone is not None and phone != '':
            user.phone = phone
            changed.append('phone')
        if location is not None and location != '':
            user.location = location
            changed.append('location')
        if user.role != 'partner':
            user.role = 'partner'
            changed.append('role')
        if changed:
            user.save(update_fields=changed)

    def create(self, validated_data):
        user = self.context['request'].user
        self._sync_user(user, validated_data)
        partner, _ = Partner.objects.get_or_create(
            user=user, defaults=validated_data
        )
        for key, value in validated_data.items():
            setattr(partner, key, value)
        partner.save()
        return partner

    def update(self, instance, validated_data):
        self._sync_user(instance.user, validated_data)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class PartnerDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = PartnerDocument
        fields = ['id', 'doc_type', 'doc_type_display', 'file', 'file_url', 'original_name',
                  'status', 'review_notes', 'uploaded_at', 'reviewed_at', 'reviewed_by_name']
        read_only_fields = ['status', 'review_notes', 'uploaded_at', 'reviewed_at',
                            'reviewed_by_name', 'original_name', 'file']

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class PartnerDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerDocument
        fields = ['doc_type', 'file']

    def validate_file(self, value):
        max_size = settings.PARTNER_DOCUMENT_MAX_SIZE
        if value.size > max_size:
            raise serializers.ValidationError(
                f'File too large. Maximum size is {max_size // (1024 * 1024)} MB.'
            )
        ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        allowed = settings.PARTNER_DOCUMENT_ALLOWED_EXTENSIONS
        if ext not in allowed:
            raise serializers.ValidationError(
                f'Unsupported file type ".{ext}". Allowed: {", ".join(allowed)}.'
            )
        return value

    def create(self, validated_data):
        validated_data['partner'] = self.context['partner']
        validated_data['original_name'] = validated_data['file'].name
        # Re-uploading a document type that was rejected replaces the old one.
        PartnerDocument.objects.filter(
            partner=validated_data['partner'],
            doc_type=validated_data['doc_type'],
            status='rejected',
        ).delete()
        return super().create(validated_data)


class PayoutSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payout
        fields = ['id', 'amount', 'method', 'method_display', 'destination', 'status',
                  'reference', 'failure_reason', 'created_at', 'processed_at']


class PayoutRequestSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=[c[0] for c in Payout.METHOD_CHOICES])
    destination = serializers.CharField(max_length=100)


class PartnerEarningSerializer(serializers.ModelSerializer):
    booking_ref = serializers.CharField(source='booking.booking_ref', read_only=True)
    customer_name = serializers.CharField(source='booking.customer.username', read_only=True)
    scheduled_date = serializers.DateField(source='booking.scheduled_date', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PartnerEarning
        fields = ['id', 'booking', 'booking_ref', 'customer_name', 'service_name', 'scheduled_date',
                  'gross_amount', 'commission_rate', 'commission_amount', 'net_amount',
                  'status', 'status_display', 'payout', 'created_at']


class PartnerMeSerializer(serializers.ModelSerializer):
    """The calling partner's own profile, with onboarding + verification detail."""
    user = UserSerializer(read_only=True)
    services = PartnerServiceSerializer(many=True, read_only=True)
    documents = PartnerDocumentSerializer(many=True, read_only=True)
    verification = serializers.SerializerMethodField()
    onboarding_complete = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = ['id', 'user', 'business_name', 'business_description', 'verification_status',
                  'avg_rating', 'total_bookings', 'total_earnings', 'coverage_radius_km',
                  'is_individual', 'commission_rate', 'is_featured', 'services', 'documents',
                  'verification', 'onboarding_complete', 'created_at']

    def get_verification(self, obj):
        from .services import document_verification_state
        return document_verification_state(obj)

    def get_onboarding_complete(self, obj):
        from .services import document_verification_state
        has_profile = bool(obj.business_name)
        has_service = obj.services.exists()
        docs_complete = document_verification_state(obj)['documents_complete']
        return {
            'profile': has_profile,
            'services': has_service,
            'documents': docs_complete,
            'all': has_profile and has_service and docs_complete,
        }


# ---------------------------------------------------------------------------
# Admin portal
# ---------------------------------------------------------------------------

class AdminUserSerializer(serializers.ModelSerializer):
    partner_id = serializers.IntegerField(source='partner_profile.id', read_only=True)
    booking_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'gender', 'location',
                  'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login',
                  'partner_id', 'booking_count']


class AdminPartnerListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    pending_documents = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = ['id', 'business_name', 'username', 'email', 'phone', 'verification_status',
                  'is_individual', 'is_featured', 'commission_rate', 'avg_rating',
                  'total_bookings', 'total_earnings', 'coverage_radius_km',
                  'pending_documents', 'created_at']

    def get_pending_documents(self, obj):
        return obj.documents.filter(status='pending').count()


class AdminPartnerDetailSerializer(AdminPartnerListSerializer):
    user = UserSerializer(read_only=True)
    services = PartnerServiceSerializer(many=True, read_only=True)
    documents = PartnerDocumentSerializer(many=True, read_only=True)
    verification = serializers.SerializerMethodField()
    earnings_summary = serializers.SerializerMethodField()

    class Meta(AdminPartnerListSerializer.Meta):
        fields = AdminPartnerListSerializer.Meta.fields + [
            'user', 'business_description', 'services', 'documents',
            'verification', 'earnings_summary', 'featured_until',
        ]

    def get_verification(self, obj):
        from .services import document_verification_state
        return document_verification_state(obj)

    def get_earnings_summary(self, obj):
        from .services import earnings_summary
        return earnings_summary(obj)


class AdminPartnerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = ['commission_rate', 'is_featured', 'featured_until', 'coverage_radius_km']


class PartnerVerificationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[c[0] for c in Partner.VERIFICATION_STATUS])
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class DocumentReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class AdminDocumentSerializer(PartnerDocumentSerializer):
    partner_id = serializers.IntegerField(source='partner.id', read_only=True)
    business_name = serializers.CharField(source='partner.business_name', read_only=True)

    class Meta(PartnerDocumentSerializer.Meta):
        fields = PartnerDocumentSerializer.Meta.fields + ['partner_id', 'business_name']


class AdminBookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    partner_name = serializers.CharField(source='partner.business_name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True, allow_null=True)
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ['id', 'booking_ref', 'customer', 'customer_name', 'customer_email',
                  'partner', 'partner_name', 'service_name', 'status', 'address',
                  'scheduled_date', 'scheduled_time', 'total_price', 'commission_amount',
                  'partner_payout', 'payment_status', 'created_at', 'completed_at']

    def get_payment_status(self, obj):
        pay = getattr(obj, 'payment', None)
        return pay.status if pay else None


class BookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[c[0] for c in Booking.STATUS_CHOICES])
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class AdminPaymentSerializer(serializers.ModelSerializer):
    booking_ref = serializers.CharField(source='booking.booking_ref', read_only=True)
    customer_name = serializers.CharField(source='booking.customer.username', read_only=True)
    partner_name = serializers.CharField(source='booking.partner.business_name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'booking', 'booking_ref', 'customer_name', 'partner_name', 'method',
                  'amount', 'status', 'transaction_id', 'phone_number', 'created_at', 'completed_at']


class AdminPayoutSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='partner.business_name', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True, allow_null=True)

    class Meta:
        model = Payout
        fields = ['id', 'partner', 'partner_name', 'amount', 'method', 'method_display',
                  'destination', 'status', 'reference', 'failure_reason',
                  'requested_by_name', 'created_at', 'processed_at']


class AdminCategorySerializer(serializers.ModelSerializer):
    partner_service_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'base_price', 'icon', 'is_active',
                  'partner_service_count']
        extra_kwargs = {'slug': {'required': False}}

    def get_partner_service_count(self, obj):
        return obj.partner_services.count()

    def validate(self, attrs):
        from django.utils.text import slugify
        if not attrs.get('slug') and attrs.get('name'):
            attrs['slug'] = slugify(attrs['name'])
        return attrs


class UserActiveSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class UserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[c[0] for c in User.ROLE_CHOICES])


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True, allow_null=True)

    class Meta:
        model = AdminActionLog
        fields = ['id', 'actor_name', 'action', 'target_type', 'target_id', 'summary',
                  'detail', 'ip_address', 'created_at']
