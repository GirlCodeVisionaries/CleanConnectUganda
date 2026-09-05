import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('partner', 'Partner'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    profile_image = models.URLField(blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class ServiceCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Partner(models.Model):
    VERIFICATION_STATUS = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='partner_profile')
    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True)
    verification_status = models.CharField(max_length=10, choices=VERIFICATION_STATUS, default='pending')
    id_document = models.URLField(blank=True)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_bookings = models.IntegerField(default=0)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coverage_radius_km = models.IntegerField(default=10)
    is_individual = models.BooleanField(default=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.business_name


class PartnerService(models.Model):
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name='services')
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='partner_services')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_room = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    duration_minutes = models.IntegerField(default=120)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.partner.business_name} - {self.name}"


class PartnerAvailability(models.Model):
    DAY_CHOICES = [
        ('mon', 'Monday'), ('tue', 'Tuesday'), ('wed', 'Wednesday'),
        ('thu', 'Thursday'), ('fri', 'Friday'), ('sat', 'Saturday'), ('sun', 'Sunday'),
    ]
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.CharField(max_length=3, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ['partner', 'day_of_week']


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('disputed', 'Disputed'),
    ]
    booking_ref = models.CharField(max_length=20, unique=True, default='')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(PartnerService, on_delete=models.SET_NULL, null=True)
    service_category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    address = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    num_rooms = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    num_bathrooms = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    special_requests = models.TextField(blank=True)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    duration_minutes = models.IntegerField(default=120)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    partner_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ai_quote_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.booking_ref:
            self.booking_ref = f"CC-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_ref} - {self.customer.username} -> {self.partner.business_name}"


class Payment(models.Model):
    METHOD_CHOICES = [
        ('mtn_momo', 'MTN Mobile Money'),
        ('airtel_money', 'Airtel Money'),
        ('card', 'Card'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payment {self.transaction_id or 'pending'} - {self.amount} UGX"


class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{'*' * self.rating} - {self.customer.username} on {self.partner.business_name}"


class AIQuoteRequest(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quote_requests')
    location = models.CharField(max_length=255)
    service_type = models.CharField(max_length=100)
    num_rooms = models.IntegerField(default=1)
    num_bathrooms = models.IntegerField(default=1)
    urgency = models.CharField(max_length=20, default='standard')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    predicted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    quotes_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quote: {self.service_type} @ {self.location}"


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    session_id = models.CharField(max_length=50, db_index=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.session_id}] {self.role}: {self.content[:50]}"


class DemandForecast(models.Model):
    location = models.CharField(max_length=255)
    service_type = models.CharField(max_length=100)
    date = models.DateField()
    predicted_demand = models.IntegerField(default=0)
    confidence = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    suggested_price_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['location', 'service_type', 'date']
        verbose_name_plural = 'Demand forecasts'
