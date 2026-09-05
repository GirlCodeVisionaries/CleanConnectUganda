from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ServiceCategory, Partner, PartnerService, PartnerAvailability,
    Booking, Payment, Review, AIQuoteRequest, ChatMessage, DemandForecast
)

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone', 'role', 'location']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'location', 'latitude', 'longitude', 'profile_image']
        read_only_fields = ['id']


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
                  'status', 'address', 'num_rooms', 'num_bathrooms', 'special_requests',
                  'scheduled_date', 'scheduled_time', 'duration_minutes',
                  'total_price', 'commission_amount', 'partner_payout',
                  'ai_quote_data', 'created_at', 'completed_at']
        read_only_fields = ['booking_ref', 'commission_amount', 'partner_payout', 'created_at']


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['partner', 'service', 'service_category', 'address', 'latitude', 'longitude',
                  'num_rooms', 'num_bathrooms', 'special_requests',
                  'scheduled_date', 'scheduled_time', 'duration_minutes',
                  'total_price', 'ai_quote_data']


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
