import math
import random
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Count
from django.utils import timezone

from .models import (
    Partner, PartnerService, PartnerAvailability,
    Booking, DemandForecast, ChatMessage
)


BASE_PRICES = {
    'home_deep_clean': {'base': 50000, 'per_room': 15000, 'per_bathroom': 10000},
    'office_cleaning': {'base': 70000, 'per_room': 20000, 'per_bathroom': 12000},
    'move_in_clean': {'base': 80000, 'per_room': 20000, 'per_bathroom': 15000},
    'move_out_clean': {'base': 75000, 'per_room': 18000, 'per_bathroom': 12000},
    'regular_clean': {'base': 35000, 'per_room': 10000, 'per_bathroom': 8000},
    'window_cleaning': {'base': 30000, 'per_room': 8000, 'per_bathroom': 5000},
    'fumigation': {'base': 100000, 'per_room': 25000, 'per_bathroom': 0},
    'laundry': {'base': 25000, 'per_room': 5000, 'per_bathroom': 0},
}

URGENCY_MULTIPLIERS = {
    'standard': 1.0,
    'scheduled': 0.9,
    'urgent': 1.35,
}

KAMPALA_NEIGHBOURHOODS = [
    'Nakawa', 'Kololo', 'Bugolobi', 'Ntinda', 'Kisementi',
    'Kabalagala', 'Bukoto', 'Kisaasi', 'Mulago', 'Wandegeya',
    'Kyanja', 'Bunga', 'Ggaba', 'Entebbe', 'Mukono',
    'Wakiso', 'Kira', 'Mbuya', 'Luzira', 'Naguru',
]


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def generate_instant_quote(location, service_type, num_rooms, num_bathrooms, urgency='standard',
                           latitude=None, longitude=None):
    pricing = BASE_PRICES.get(service_type, BASE_PRICES['home_deep_clean'])

    base = pricing['base']
    room_cost = pricing['per_room'] * max(num_rooms - 1, 0)
    bathroom_cost = pricing['per_bathroom'] * num_bathrooms
    subtotal = base + room_cost + bathroom_cost

    urgency_mult = URGENCY_MULTIPLIERS.get(urgency, 1.0)
    subtotal *= urgency_mult

    forecast = _get_demand_adjustment(location, service_type)
    subtotal *= float(forecast)

    noise = random.uniform(0.95, 1.05)
    predicted_price = round(subtotal * noise / 1000) * 1000
    predicted_price = max(predicted_price, 25000)

    partners = _find_matching_partners(location, service_type, num_rooms, latitude, longitude)

    quotes = []
    for p in partners[:5]:
        partner_services = p.services.filter(is_available=True)
        ps = partner_services.first()
        if ps:
            partner_base = float(ps.base_price)
            partner_room = float(ps.price_per_room) * max(num_rooms - 1, 0)
            partner_total = partner_base + partner_room
            partner_total *= urgency_mult
            partner_total *= float(forecast)
            partner_total = round(partner_total * noise / 1000) * 1000
            partner_total = max(partner_total, float(ps.min_price) if ps.min_price else 25000)
        else:
            partner_total = predicted_price + random.choice([-10000, -5000, 0, 5000, 10000])
            partner_total = max(partner_total, 30000)

        distance = None
        if latitude and longitude and p.user.latitude and p.user.longitude:
            distance = round(_haversine_km(latitude, longitude, p.user.latitude, p.user.longitude), 1)

        quotes.append({
            'partner_id': p.id,
            'partner_name': p.business_name,
            'rating': float(p.avg_rating),
            'rating_display': f"{p.avg_rating:.1f}",
            'price': int(partner_total),
            'price_display': f"UGX {int(partner_total):,}",
            'total_bookings': p.total_bookings,
            'is_featured': p.is_featured,
            'distance_km': distance,
            'estimated_duration': _estimate_duration(service_type, num_rooms, num_bathrooms),
            'next_available': _next_available_slot(p),
        })

    quotes.sort(key=lambda q: (-q['rating'], q['price']))

    return {
        'predicted_price': int(predicted_price),
        'predicted_price_display': f"UGX {int(predicted_price):,}",
        'service_type': service_type,
        'location': location,
        'num_rooms': num_rooms,
        'num_bathrooms': num_bathrooms,
        'urgency': urgency,
        'demand_level': float(forecast),
        'quotes': quotes,
        'quote_count': len(quotes),
        'assurance': {
            're_clean': True,
            'refund_policy': 'Full refund if not satisfied within 24 hours',
            'replacement': 'Free replacement partner if needed',
        },
    }


def _get_demand_adjustment(location, service_type):
    today = timezone.now().date()
    forecast = DemandForecast.objects.filter(
        location__icontains=location.split(',')[0].strip(),
        service_type=service_type,
        date__gte=today,
        date__lte=today + timedelta(days=7),
    ).first()

    if forecast:
        return forecast.suggested_price_multiplier

    day_of_week = timezone.now().weekday()
    if day_of_week >= 5:
        return Decimal('1.15')
    if day_of_week == 0:
        return Decimal('1.05')
    return Decimal('1.0')


def _find_matching_partners(location, service_type, num_rooms, latitude=None, longitude=None):
    partners = Partner.objects.filter(
        verification_status='verified',
        services__is_available=True,
    ).select_related('user').distinct()

    if latitude and longitude:
        partner_distances = []
        for p in partners:
            if p.user.latitude and p.user.longitude:
                dist = _haversine_km(latitude, longitude, p.user.latitude, p.user.longitude)
                if dist <= p.coverage_radius_km:
                    partner_distances.append((p, dist))
            else:
                partner_distances.append((p, 5.0))
        partner_distances.sort(key=lambda x: x[1])
        partners = [p for p, _ in partner_distances]
    else:
        partners = list(partners)

    partners.sort(key=lambda p: (-float(p.avg_rating), -p.total_bookings))
    return partners


def smart_match(location, service_type, num_rooms, latitude=None, longitude=None, max_results=3):
    quotes = generate_instant_quote(location, service_type, num_rooms, 1, 'standard', latitude, longitude)

    scored = []
    for q in quotes['quotes']:
        score = 0
        score += q['rating'] * 20
        if q['distance_km'] is not None:
            score += max(0, 30 - q['distance_km'] * 3)
        score += min(q['total_bookings'] * 0.5, 20)
        if q['is_featured']:
            score += 5
        score += max(0, 20 - (q['price'] - quotes['predicted_price']) / 5000)

        scored.append({**q, 'match_score': round(score, 1)})

    scored.sort(key=lambda x: -x['match_score'])
    return scored[:max_results]


def forecast_demand(location, service_type, days=14):
    today = timezone.now().date()
    forecasts = []

    historical_avg = Booking.objects.filter(
        status='completed',
        address__icontains=location.split(',')[0].strip(),
    ).count()

    base_demand = max(historical_avg // 30, 3) if historical_avg > 0 else 5

    for i in range(days):
        date = today + timedelta(days=i)
        day_of_week = date.weekday()

        if day_of_week >= 5:
            demand = int(base_demand * random.uniform(1.3, 1.8))
            multiplier = round(random.uniform(1.1, 1.25), 2)
        elif day_of_week == 0:
            demand = int(base_demand * random.uniform(1.1, 1.3))
            multiplier = round(random.uniform(1.0, 1.1), 2)
        else:
            demand = int(base_demand * random.uniform(0.7, 1.0))
            multiplier = round(random.uniform(0.9, 1.05), 2)

        confidence = round(random.uniform(0.72, 0.95), 4)

        forecast_obj, _ = DemandForecast.objects.update_or_create(
            location=location,
            service_type=service_type,
            date=date,
            defaults={
                'predicted_demand': demand,
                'confidence': confidence,
                'suggested_price_multiplier': multiplier,
            }
        )

        forecasts.append({
            'date': date.isoformat(),
            'day_name': date.strftime('%A'),
            'predicted_demand': demand,
            'confidence': confidence,
            'suggested_price_multiplier': multiplier,
            'demand_level': 'high' if demand > base_demand * 1.2 else ('low' if demand < base_demand * 0.8 else 'normal'),
        })

    return {
        'location': location,
        'service_type': service_type,
        'base_daily_demand': base_demand,
        'forecast_period_days': days,
        'forecasts': forecasts,
        'summary': {
            'peak_days': [f['date'] for f in forecasts if f['demand_level'] == 'high'],
            'avg_daily_demand': round(sum(f['predicted_demand'] for f in forecasts) / len(forecasts), 1),
            'recommended_pricing_strategy': 'dynamic' if any(f['demand_level'] == 'high' for f in forecasts) else 'standard',
        }
    }


def ai_chat_respond(session_id, user_message):
    ChatMessage.objects.create(session_id=session_id, role='user', content=user_message)

    msg_lower = user_message.lower().strip()

    response = _generate_chat_response(msg_lower, user_message)

    ChatMessage.objects.create(session_id=session_id, role='assistant', content=response)

    history = ChatMessage.objects.filter(session_id=session_id).order_by('created_at')[:20]
    return {
        'reply': response,
        'session_id': session_id,
        'suggestions': _get_suggestions(msg_lower),
        'history': [{'role': m.role, 'content': m.content} for m in history],
    }


def _generate_chat_response(msg_lower, original_message):
    if any(w in msg_lower for w in ['hello', 'hi', 'hey', 'webale', 'muzungu']):
        return ("Webale nnyo! Welcome to CleanConnect Uganda! I'm your AI booking assistant.\n\n"
                "I can help you with:\n"
                "- Getting instant quotes for cleaning services\n"
                "- Booking a verified partner\n"
                "- Checking availability\n"
                "- Understanding our service guarantee\n\n"
                "What can I help you with today?")

    if any(w in msg_lower for w in ['price', 'cost', 'how much', 'quote', 'charge']):
        return ("Our pricing depends on the service type, number of rooms, and urgency.\n\n"
                "Here are our starting prices:\n"
                "- Home Deep Clean: from UGX 50,000\n"
                "- Regular Clean: from UGX 35,000\n"
                "- Office Cleaning: from UGX 70,000\n"
                "- Move-in/Move-out: from UGX 75,000\n\n"
                "Tell me your location and number of rooms, and I'll get you an instant quote!")

    if any(w in msg_lower for w in ['book', 'schedule', 'appointment', 'reserve']):
        return ("Great! To book a cleaning service, I need a few details:\n\n"
                "1. Your location (neighbourhood in Kampala or other city)\n"
                "2. Service type (home deep clean, regular clean, office, etc.)\n"
                "3. Number of rooms and bathrooms\n"
                "4. Preferred date and time\n\n"
                "Once you share these, I'll find the best verified partners near you!")

    if any(w in msg_lower for w in ['guarantee', 'assurance', 'refund', 're-clean']):
        return ("Every CleanConnect booking is covered by our Assurance Guarantee:\n\n"
                "- Re-clean: If you're not satisfied, we'll send a partner to re-clean for free\n"
                "- Refund: Full refund if the issue can't be resolved within 24 hours\n"
                "- Replacement: We'll send a different verified partner at no extra cost\n\n"
                "Your satisfaction is our priority!")

    if any(w in msg_lower for w in ['payment', 'pay', 'momo', 'mobile money', 'mtn', 'airtel']):
        return ("We support secure mobile payments:\n\n"
                "- MTN Mobile Money (MoMo)\n"
                "- Airtel Money\n"
                "- Bank Card (Visa/Mastercard)\n\n"
                "Payment is held securely until the job is completed. You only confirm payment "
                "when you're satisfied with the service!")

    if any(w in msg_lower for w in ['partner', 'cleaner', 'company', 'verified']):
        return ("All CleanConnect partners go through a thorough verification process:\n\n"
                "1. ID and background checks\n"
                "2. Reference verification\n"
                "3. Sample job review\n"
                "4. Ongoing quality monitoring via ratings\n\n"
                "We currently have verified partners across Kampala, Entebbe, Mukono, and Jinja. "
                "Each partner has a public rating so you can choose with confidence!")

    if any(w in msg_lower for w in ['available', 'when', 'time', 'today', 'tomorrow']):
        return ("Our partners are available 7 days a week! Most partners operate between "
                "7:00 AM and 7:00 PM.\n\n"
                "For same-day bookings, I recommend booking before 2 PM to ensure availability. "
                "For urgent same-day service, there may be a small urgency surcharge.\n\n"
                "Would you like me to check availability for a specific date?")

    if any(w in msg_lower for w in ['area', 'location', 'where', 'coverage', 'kampala']):
        return ("We currently operate in:\n\n"
                "- Kampala (all divisions: Central, Kawempe, Makindye, Nakawa, Rubaga)\n"
                "- Entebbe\n"
                "- Mukono\n"
                "- Wakiso\n"
                "- Jinja\n\n"
                "We're expanding to Mbarara, Gulu, and Mbale soon! "
                "Enter your location to see available partners near you.")

    if any(w in msg_lower for w in ['cancel', 'reschedule', 'change']):
        return ("You can cancel or reschedule your booking:\n\n"
                "- Free cancellation up to 4 hours before the scheduled time\n"
                "- Rescheduling is free at any time (subject to partner availability)\n"
                "- Late cancellations may incur a small fee\n\n"
                "To cancel or reschedule, go to your bookings page or tell me your booking reference.")

    if any(w in msg_lower for w in ['thank', 'thanks', 'webale', 'asante']):
        return ("You're welcome! If you need anything else, I'm here to help.\n\n"
                "Remember: CleanConnect - Instant quotes. Verified partners. Guaranteed quality.\n"
                "One tap away, anywhere in Uganda!")

    return ("Thanks for your message! I'm the CleanConnect AI assistant.\n\n"
            "I can help you with:\n"
            "- Getting instant quotes\n"
            "- Booking a cleaning service\n"
            "- Checking partner availability\n"
            "- Payment information\n"
            "- Our service guarantee\n\n"
            "Try asking: \"How much does a home deep clean cost in Nakawa?\" or "
            "\"I want to book a cleaner for tomorrow\"")


def _get_suggestions(msg_lower):
    if any(w in msg_lower for w in ['price', 'cost', 'how much']):
        return ['Book a cleaner', 'What areas do you cover?', 'How does the guarantee work?']
    if any(w in msg_lower for w in ['book', 'schedule']):
        return ['Home Deep Clean', 'Regular Clean', 'Office Cleaning']
    if any(w in msg_lower for w in ['hello', 'hi', 'hey']):
        return ['Get a quote', 'Book a cleaner', 'What services do you offer?']
    return ['Get a quote', 'Book a cleaner', 'How does payment work?', 'What is the guarantee?']


def _estimate_duration(service_type, num_rooms, num_bathrooms):
    base_minutes = {
        'home_deep_clean': 90, 'office_cleaning': 120, 'move_in_clean': 150,
        'move_out_clean': 140, 'regular_clean': 60, 'window_cleaning': 45,
        'fumigation': 180, 'laundry': 40,
    }
    base = base_minutes.get(service_type, 90)
    extra = (max(num_rooms - 1, 0) * 20) + (num_bathrooms * 15)
    return base + extra


def _next_available_slot(partner):
    now = timezone.now()
    today_avail = PartnerAvailability.objects.filter(
        partner=partner,
        day_of_week=now.strftime('%a').lower()[:3],
        is_available=True,
    ).first()

    if today_avail and now.time() < today_avail.end_time:
        next_hour = now.replace(minute=0, second=0) + timedelta(hours=1)
        if today_avail.start_time <= next_hour.time() <= today_avail.end_time:
            return {
                'date': now.date().isoformat(),
                'time': next_hour.strftime('%H:%M'),
                'display': f"Today, {next_hour.strftime('%I:%M %p')}",
            }

    for i in range(1, 8):
        future = now + timedelta(days=i)
        day_code = future.strftime('%a').lower()[:3]
        avail = PartnerAvailability.objects.filter(
            partner=partner,
            day_of_week=day_code,
            is_available=True,
        ).first()
        if avail:
            slot_time = datetime.combine(future.date(), avail.start_time)
            return {
                'date': future.date().isoformat(),
                'time': avail.start_time.strftime('%H:%M'),
                'display': f"{future.strftime('%a %b %d')}, {avail.start_time.strftime('%I:%M %p')}",
            }

    return {'date': None, 'time': None, 'display': 'Contact partner for availability'}


def compute_trust_score(partner_id):
    partner = Partner.objects.get(id=partner_id)
    score = 50

    score += float(partner.avg_rating) * 8
    score += min(partner.total_bookings * 0.5, 25)

    recent_bookings = Booking.objects.filter(partner=partner, status='completed').count()
    cancelled = Booking.objects.filter(partner=partner, status='cancelled').count()
    disputed = Booking.objects.filter(partner=partner, status='disputed').count()

    if recent_bookings > 0:
        cancel_rate = cancelled / (recent_bookings + cancelled)
        dispute_rate = disputed / (recent_bookings + disputed)
        score -= cancel_rate * 30
        score -= dispute_rate * 40

    review_count = partner.reviews.count()
    if review_count > 10:
        score += 10
    elif review_count > 5:
        score += 5

    return max(0, min(100, round(score, 1)))


FEMALE_DISCOUNT_PERCENT = 5


def calculate_gender_discount(base_price, gender):
    if gender == 'female':
        discount_amount = round(base_price * FEMALE_DISCOUNT_PERCENT / 100 / 1000) * 1000
        discount_amount = max(discount_amount, 1000)
        return {
            'discount_percent': FEMALE_DISCOUNT_PERCENT,
            'discount_amount': int(discount_amount),
            'final_price': int(base_price) - int(discount_amount),
            'message': f'Women get {FEMALE_DISCOUNT_PERCENT}% off!',
        }
    return {
        'discount_percent': 0,
        'discount_amount': 0,
        'final_price': int(base_price),
        'message': '',
    }


def ai_auto_assign(location, service_type, num_rooms, num_bathrooms, urgency='standard',
                   latitude=None, longitude=None, gender=''):
    pricing = BASE_PRICES.get(service_type, BASE_PRICES['home_deep_clean'])
    base = pricing['base']
    room_cost = pricing['per_room'] * max(num_rooms - 1, 0)
    bathroom_cost = pricing['per_bathroom'] * num_bathrooms
    subtotal = base + room_cost + bathroom_cost

    urgency_mult = URGENCY_MULTIPLIERS.get(urgency, 1.0)
    subtotal *= urgency_mult

    forecast = _get_demand_adjustment(location, service_type)
    subtotal *= float(forecast)

    noise = random.uniform(0.97, 1.03)
    platform_price = round(subtotal * noise / 1000) * 1000
    platform_price = max(platform_price, 25000)

    discount_info = calculate_gender_discount(platform_price, gender)

    partners = _find_matching_partners(location, service_type, num_rooms, latitude, longitude)

    scored = []
    for p in partners:
        score = 0
        score += float(p.avg_rating) * 20
        score += min(p.total_bookings * 0.5, 25)

        distance = None
        if latitude and longitude and p.user.latitude and p.user.longitude:
            distance = _haversine_km(latitude, longitude, p.user.latitude, p.user.longitude)
            if distance <= p.coverage_radius_km:
                score += max(0, 30 - distance * 3)
            else:
                score -= 20
        else:
            score += 10

        recent = Booking.objects.filter(partner=p, status='completed').count()
        cancelled = Booking.objects.filter(partner=p, status='cancelled').count()
        if recent > 0:
            completion_rate = recent / (recent + cancelled)
            score += completion_rate * 15

        avail = PartnerAvailability.objects.filter(
            partner=p, is_available=True
        ).exists()
        if avail:
            score += 10

        scored.append({
            'partner': p,
            'score': score,
            'distance_km': round(distance, 1) if distance is not None else None,
        })

    scored.sort(key=lambda x: -x['score'])

    if not scored:
        return {
            'assigned': False,
            'message': 'No partners available for this request right now.',
        }

    best = scored[0]
    partner = best['partner']

    partner_services = partner.services.filter(is_available=True)
    ps = partner_services.first()
    estimated_duration = _estimate_duration(service_type, num_rooms, num_bathrooms)

    next_slot = _next_available_slot(partner)

    return {
        'assigned': True,
        'platform_price': int(platform_price),
        'platform_price_display': f"UGX {int(platform_price):,}",
        'discount': discount_info,
        'final_price': discount_info['final_price'],
        'final_price_display': f"UGX {discount_info['final_price']:,}",
        'service_type': service_type,
        'location': location,
        'num_rooms': num_rooms,
        'num_bathrooms': num_bathrooms,
        'urgency': urgency,
        'estimated_duration': estimated_duration,
        'partner_id': partner.id,
        'partner_rating': float(partner.avg_rating),
        'partner_rating_display': f"{partner.avg_rating:.1f}",
        'partner_distance_km': best['distance_km'],
        'ai_match_score': round(best['score'], 1),
        'ai_match_reason': _build_match_reason(best),
        'next_available': next_slot,
        'partners_considered': len(scored),
        'assurance': {
            're_clean': True,
            'refund_policy': 'Full refund if not satisfied within 24 hours',
            'replacement': 'Free replacement partner if needed',
        },
    }


def _build_match_reason(match):
    reasons = []
    if match['partner'].avg_rating >= 4.7:
        reasons.append('top-rated')
    if match['distance_km'] is not None and match['distance_km'] <= 5:
        reasons.append('nearby')
    if match['partner'].total_bookings >= 100:
        reasons.append('highly experienced')
    if not reasons:
        reasons.append('best overall fit')
    return 'AI selected this partner because they are ' + ', '.join(reasons)

