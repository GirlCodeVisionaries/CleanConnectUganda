import uuid
from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import (
    Partner, PartnerService, PartnerAvailability,
    Booking, Payment, Review, ServiceCategory, AIQuoteRequest
)
from .serializers import (
    UserRegisterSerializer, UserLoginSerializer, UserSerializer,
    ServiceCategorySerializer, PartnerSerializer, PartnerListSerializer,
    PartnerCreateSerializer, PartnerServiceSerializer, PartnerAvailabilitySerializer,
    BookingSerializer, BookingCreateSerializer,
    PaymentSerializer, PaymentCreateSerializer,
    ReviewSerializer, AIQuoteRequestSerializer, AIQuoteInputSerializer,
    ChatInputSerializer, ChatMessageSerializer,
)
from .ai_engine import (
    generate_instant_quote, smart_match, forecast_demand,
    ai_chat_respond, compute_trust_score
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Login successful'
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def service_categories(request):
    categories = ServiceCategory.objects.filter(is_active=True)
    return Response(ServiceCategorySerializer(categories, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def partners_list(request):
    if request.method == 'GET':
        location = request.query_params.get('location', '')
        service_type = request.query_params.get('service_type', '')
        partners = Partner.objects.filter(verification_status='verified').select_related('user').prefetch_related('services')

        if location:
            partners = partners.order_by('-avg_rating', '-total_bookings')
        if service_type:
            partners = partners.filter(services__category__slug=service_type).distinct()

        return Response(PartnerListSerializer(partners, many=True).data)

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = PartnerCreateSerializer(data=request.data)
    if serializer.is_valid():
        partner = serializer.save(user=request.user)
        request.user.role = 'partner'
        request.user.save()
        return Response(PartnerSerializer(partner).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def partner_detail(request, pk):
    try:
        partner = Partner.objects.select_related('user').prefetch_related('services', 'availability').get(pk=pk)
    except Partner.DoesNotExist:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        data = PartnerSerializer(partner).data
        data['availability'] = PartnerAvailabilitySerializer(partner.availability.all(), many=True).data
        data['trust_score'] = compute_trust_score(pk)
        data['reviews'] = ReviewSerializer(
            Review.objects.filter(partner=partner).order_by('-created_at')[:10], many=True
        ).data
        return Response(data)

    if request.user != partner.user and not request.user.is_staff:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    serializer = PartnerSerializer(partner, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def partner_services(request, partner_pk):
    try:
        partner = Partner.objects.get(pk=partner_pk)
    except Partner.DoesNotExist:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        services = partner.services.all()
        return Response(PartnerServiceSerializer(services, many=True).data)

    if request.user != partner.user and not request.user.is_staff:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    serializer = PartnerServiceSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(partner=partner)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bookings_list(request):
    if request.method == 'GET':
        if request.user.role == 'partner':
            try:
                partner = Partner.objects.get(user=request.user)
                bookings = Booking.objects.filter(partner=partner).order_by('-created_at')
            except Partner.DoesNotExist:
                bookings = Booking.objects.none()
        else:
            bookings = Booking.objects.filter(customer=request.user).order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            bookings = bookings.filter(status=status_filter)

        return Response(BookingSerializer(bookings, many=True).data)

    serializer = BookingCreateSerializer(data=request.data)
    if serializer.is_valid():
        booking = serializer.save(customer=request.user)

        commission_rate = Decimal(str(booking.partner.commission_rate)) / Decimal('100')
        booking.commission_amount = booking.total_price * commission_rate
        booking.partner_payout = booking.total_price - booking.commission_amount
        booking.save()

        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def booking_detail(request, pk):
    try:
        booking = Booking.objects.select_related('partner', 'customer', 'service').get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != booking.customer and request.user != booking.partner.user and not request.user.is_staff:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        data = BookingSerializer(booking).data
        try:
            data['payment'] = PaymentSerializer(Payment.objects.get(booking=booking)).data
        except Payment.DoesNotExist:
            data['payment'] = None
        try:
            data['review'] = ReviewSerializer(Review.objects.get(booking=booking)).data
        except Review.DoesNotExist:
            data['review'] = None
        return Response(data)

    new_status = request.data.get('status')
    if new_status:
        booking.status = new_status
        if new_status == 'completed':
            booking.completed_at = timezone.now()
            booking.partner.total_bookings += 1
            booking.partner.total_earnings += booking.partner_payout
            booking.partner.save()
        booking.save()

    return Response(BookingSerializer(booking).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_create(request):
    serializer = PaymentCreateSerializer(data=request.data)
    if serializer.is_valid():
        booking = serializer.validated_data['booking']
        if request.user != booking.customer:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        payment = Payment.objects.create(
            booking=booking,
            method=serializer.validated_data['method'],
            amount=booking.total_price,
            phone_number=serializer.validated_data.get('phone_number', ''),
            status='completed',
            transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            completed_at=timezone.now(),
        )

        booking.status = 'confirmed'
        booking.save()

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reviews_list(request):
    if request.method == 'GET':
        partner_id = request.query_params.get('partner')
        if partner_id:
            reviews = Review.objects.filter(partner_id=partner_id).order_by('-created_at')
        else:
            reviews = Review.objects.filter(customer=request.user).order_by('-created_at')
        return Response(ReviewSerializer(reviews, many=True).data)

    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        booking = serializer.validated_data['booking']
        if request.user != booking.customer:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if Review.objects.filter(booking=booking).exists():
            return Response({'error': 'Review already exists for this booking'}, status=status.HTTP_400_BAD_REQUEST)

        review = serializer.save(customer=request.user)

        avg = Review.objects.filter(partner=review.partner).aggregate(avg=Avg('rating'))['avg']
        review.partner.avg_rating = avg or 0
        review.partner.save()

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_quote(request):
    serializer = AIQuoteInputSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        result = generate_instant_quote(
            location=data['location'],
            service_type=data['service_type'],
            num_rooms=data['num_rooms'],
            num_bathrooms=data['num_bathrooms'],
            urgency=data.get('urgency', 'standard'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
        )

        AIQuoteRequest.objects.create(
            customer=request.user,
            location=data['location'],
            service_type=data['service_type'],
            num_rooms=data['num_rooms'],
            num_bathrooms=data['num_bathrooms'],
            urgency=data.get('urgency', 'standard'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            predicted_price=result['predicted_price'],
            quotes_data=result,
        )

        return Response(result)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_match(request):
    serializer = AIQuoteInputSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        result = smart_match(
            location=data['location'],
            service_type=data['service_type'],
            num_rooms=data['num_rooms'],
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
        )
        return Response({
            'matches': result,
            'match_count': len(result),
            'location': data['location'],
            'service_type': data['service_type'],
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_forecast(request):
    location = request.query_params.get('location', 'Kampala')
    service_type = request.query_params.get('service_type', 'home_deep_clean')
    days = int(request.query_params.get('days', 14))
    result = forecast_demand(location, service_type, days)
    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_chat(request):
    serializer = ChatInputSerializer(data=request.data)
    if serializer.is_valid():
        result = ai_chat_respond(
            session_id=serializer.validated_data['session_id'],
            user_message=serializer.validated_data['message'],
        )
        return Response(result)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def ai_trust_score(request, partner_pk):
    try:
        Partner.objects.get(pk=partner_pk)
    except Partner.DoesNotExist:
        return Response({'error': 'Partner not found'}, status=status.HTTP_404_NOT_FOUND)
    score = compute_trust_score(partner_pk)
    return Response({'partner_id': partner_pk, 'trust_score': score})


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    total_partners = Partner.objects.filter(verification_status='verified').count()
    total_bookings = Booking.objects.count()
    completed_bookings = Booking.objects.filter(status='completed').count()
    total_customers = User.objects.filter(role='customer').count()
    avg_booking_value = 0
    if completed_bookings > 0:
        from django.db.models import Avg as DBAvg
        avg_booking_value = Booking.objects.filter(status='completed').aggregate(
            avg=DBAvg('total_price')
        )['avg'] or 0

    return Response({
        'total_partners': total_partners,
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'total_customers': total_customers,
        'avg_booking_value': round(float(avg_booking_value), 2),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def hello(request):
    return Response({
        'message': 'Welcome to CleanConnect Uganda API',
        'version': '1.0.0',
        'tagline': 'Instant quotes. Verified partners. Guaranteed quality.',
    })
