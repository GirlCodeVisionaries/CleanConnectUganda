import os
import sys
import random
from datetime import time, timedelta
from decimal import Decimal

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone as tz

from django.contrib.auth import get_user_model
from core.models import (
    ServiceCategory, Partner, PartnerService, PartnerAvailability,
    Booking, Review
)

User = get_user_model()


def seed_service_categories():
    categories = [
        {'name': 'Home Deep Clean', 'slug': 'home_deep_clean', 'base_price': 50000, 'icon': 'home',
         'description': 'Thorough cleaning of your entire home including hard-to-reach areas'},
        {'name': 'Regular Clean', 'slug': 'regular_clean', 'base_price': 35000, 'icon': 'sparkles',
         'description': 'Standard cleaning for regularly maintained spaces'},
        {'name': 'Office Cleaning', 'slug': 'office_cleaning', 'base_price': 70000, 'icon': 'briefcase',
         'description': 'Professional cleaning for offices and commercial spaces'},
        {'name': 'Move-in Clean', 'slug': 'move_in_clean', 'base_price': 80000, 'icon': 'truck',
         'description': 'Deep cleaning for new homes before moving in'},
        {'name': 'Move-out Clean', 'slug': 'move_out_clean', 'base_price': 75000, 'icon': 'package',
         'description': 'Thorough cleaning when vacating a property'},
        {'name': 'Window Cleaning', 'slug': 'window_cleaning', 'base_price': 30000, 'icon': 'maximize',
         'description': 'Interior and exterior window cleaning'},
        {'name': 'Fumigation', 'slug': 'fumigation', 'base_price': 100000, 'icon': 'shield',
         'description': 'Pest control and fumigation services'},
        {'name': 'Laundry', 'slug': 'laundry', 'base_price': 25000, 'icon': 'droplet',
         'description': 'Professional laundry and dry cleaning services'},
    ]

    for cat in categories:
        ServiceCategory.objects.get_or_create(
            slug=cat['slug'],
            defaults=cat
        )
    print(f"Created {len(categories)} service categories")


def seed_partners():
    partner_data = [
        {
            'username': 'sparklehome',
            'email': 'info@sparklehome.ug',
            'password': 'partner123',
            'business_name': 'SparkleHome Ltd',
            'business_description': 'Professional home cleaning services with 5+ years experience in Kampala',
            'location': 'Nakawa, Kampala',
            'latitude': 0.3136,
            'longitude': 32.6082,
            'rating': 4.8,
            'bookings': 234,
            'is_individual': False,
        },
        {
            'username': 'janes_cleaning',
            'email': 'jane@janescleaning.ug',
            'password': 'partner123',
            'business_name': "Jane's Cleaning Crew",
            'business_description': 'Affordable and reliable cleaning services for homes and offices',
            'location': 'Kololo, Kampala',
            'latitude': 0.3339,
            'longitude': 32.5811,
            'rating': 4.6,
            'bookings': 189,
            'is_individual': False,
        },
        {
            'username': 'tidyup_ug',
            'email': 'hello@tidyup.ug',
            'password': 'partner123',
            'business_name': 'TidyUp Uganda',
            'business_description': 'Premium cleaning solutions with eco-friendly products',
            'location': 'Bugolobi, Kampala',
            'latitude': 0.3211,
            'longitude': 32.6123,
            'rating': 4.9,
            'bookings': 312,
            'is_individual': False,
        },
        {
            'username': 'mama_clean',
            'email': 'mama@gmail.com',
            'password': 'partner123',
            'business_name': 'Mama Clean Services',
            'business_description': 'Individual cleaner with 8 years of experience in residential cleaning',
            'location': 'Ntinda, Kampala',
            'latitude': 0.3412,
            'longitude': 32.6245,
            'rating': 4.7,
            'bookings': 156,
            'is_individual': True,
        },
        {
            'username': 'fresh_spaces',
            'email': 'info@freshspaces.ug',
            'password': 'partner123',
            'business_name': 'Fresh Spaces Ltd',
            'business_description': 'Specialized in office and commercial space cleaning',
            'location': 'Kisementi, Kampala',
            'latitude': 0.3289,
            'longitude': 32.5678,
            'rating': 4.5,
            'bookings': 98,
            'is_individual': False,
        },
        {
            'username': 'quick_clean',
            'email': 'quickclean@gmail.com',
            'password': 'partner123',
            'business_name': 'Quick Clean Pro',
            'business_description': 'Fast and efficient cleaning services, available 7 days a week',
            'location': 'Kabalagala, Kampala',
            'latitude': 0.3178,
            'longitude': 32.5890,
            'rating': 4.4,
            'bookings': 145,
            'is_individual': True,
        },
    ]

    for data in partner_data:
        user, created = User.objects.get_or_create(
            username=data['username'],
            defaults={
                'email': data['email'],
                'role': 'partner',
                'phone': f"+256 7{random.randint(00, 99):02d} {random.randint(100, 999):03d} {random.randint(100, 999):03d}",
                'location': data['location'],
                'latitude': data['latitude'],
                'longitude': data['longitude'],
            }
        )
        if created:
            user.set_password(data['password'])
            user.save()

        partner, _ = Partner.objects.get_or_create(
            user=user,
            defaults={
                'business_name': data['business_name'],
                'business_description': data['business_description'],
                'verification_status': 'verified',
                'avg_rating': data['rating'],
                'total_bookings': data['bookings'],
                'coverage_radius_km': 15,
                'is_individual': data['is_individual'],
                'commission_rate': 18.00,
            }
        )

        if created:
            seed_partner_services(partner)
            seed_partner_availability(partner)

    print(f"Created {len(partner_data)} partners")


def seed_partner_services(partner):
    categories = ServiceCategory.objects.all()
    services_to_add = [
        ('Home Deep Clean', 50000, 15000, 40000, 120),
        ('Regular Clean', 35000, 10000, 25000, 60),
        ('Office Cleaning', 70000, 20000, 50000, 150),
    ]

    for cat_name, base, per_room, min_price, duration in services_to_add:
        category = categories.filter(slug=cat_name.lower().replace(' ', '_')).first()
        if category:
            PartnerService.objects.get_or_create(
                partner=partner,
                category=category,
                defaults={
                    'name': cat_name,
                    'base_price': base,
                    'price_per_room': per_room,
                    'min_price': min_price,
                    'duration_minutes': duration,
                    'is_available': True,
                }
            )


def seed_partner_availability(partner):
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    for day in days:
        PartnerAvailability.objects.get_or_create(
            partner=partner,
            day_of_week=day,
            defaults={
                'start_time': time(7, 0),
                'end_time': time(19, 0),
                'is_available': True,
            }
        )


def seed_sample_bookings():
    customers = User.objects.filter(role='customer')[:3]
    partners = Partner.objects.filter(verification_status='verified')

    if not customers.exists():
        customer1, _ = User.objects.get_or_create(
            username='aisha_demo',
            defaults={
                'email': 'aisha@example.com',
                'role': 'customer',
                'gender': 'female',
                'phone': '+256 701 234 567',
                'location': 'Nakawa, Kampala',
            }
        )
        customer1.set_password('customer123')
        customer1.save()
        customers = [customer1]

    for customer in customers:
        for partner in partners[:2]:
            service = partner.services.first()
            if service:
                scheduled_date = tz.now().date() - timedelta(days=random.randint(1, 30))
                booking, created = Booking.objects.get_or_create(
                    customer=customer,
                    partner=partner,
                    scheduled_date=scheduled_date,
                    defaults={
                        'service': service,
                        'service_category': service.category,
                        'status': 'completed',
                        'address': f'{partner.user.location}, Kampala',
                        'num_rooms': random.randint(2, 4),
                        'num_bathrooms': random.randint(1, 2),
                        'scheduled_time': time(9, 0),
                        'duration_minutes': service.duration_minutes,
                        'total_price': service.base_price + (service.price_per_room * 2),
                        'commission_amount': (service.base_price + (service.price_per_room * 2)) * Decimal('0.18'),
                        'partner_payout': (service.base_price + (service.price_per_room * 2)) * Decimal('0.82'),
                    }
                )
                if created:
                    Review.objects.get_or_create(
                        booking=booking,
                        defaults={
                            'customer': customer,
                            'partner': partner,
                            'rating': random.choice([4, 5, 5, 5]),
                            'comment': random.choice([
                                'Excellent service! Very thorough and professional.',
                                'Great job, would definitely book again.',
                                'On time and did a fantastic clean.',
                                'Very satisfied with the service quality.',
                            ]),
                            'is_verified': True,
                        }
                    )

    print("Created sample bookings and reviews")


def seed_admin_user():
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@cleanconnect.ug',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created:
        admin.set_password('admin123')
        admin.save()
        print("Created admin user (username: admin, password: admin123)")


if __name__ == '__main__':
    print("Seeding database...")
    seed_service_categories()
    seed_partners()
    seed_sample_bookings()
    seed_admin_user()
    print("Database seeding complete!")
