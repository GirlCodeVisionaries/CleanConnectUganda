# CleanConnect Uganda

An on-demand cleaning service marketplace that connects customers with verified cleaning partners across Uganda. Built with a Jumia-style model where AI automatically assigns the best cleaning partner - customers never see or choose partners directly.

## Features

- **AI-Powered Partner Matching**: Automatically assigns the best cleaning partner based on rating, distance, availability, and completion rate
- **Dynamic Pricing**: Calculates fair prices based on service type, property size, location, and demand
- **Automatic 5% Discount**: Applied for female users based on their profile
- **Google Gemini AI Chatbot**: Natural language assistant that can answer any question
- **Secure Payments**: MTN Mobile Money, Airtel Money, and card support
- **Service Guarantee**: Re-clean, refund, or replacement partner if needed
- **Real-time Availability**: Live partner calendars and booking slots

## Tech Stack

### Backend (Python/Django)
- **Django 4.2** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL (Neon)** - Cloud database
- **Google Gemini 3.6 Flash** - AI chatbot
- **Custom AI Engine** - Partner matching, pricing algorithms, demand forecasting

### Frontend (React)
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Navigation
- **Axios** - API client
- **Lucide React** - Icons

## Project Structure

```
UISAC/
├── api/                 # Django backend
│   ├── config/         # Django settings
│   ├── core/           # Main app (models, views, AI engine)
│   ├── manage.py
│   └── requirements.txt
└── frontend/           # React frontend
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/   # API calls
    │   └── context/    # Auth context
    └── package.json
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd api
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Create .env file with:
DATABASE_URL=postgresql://neondb_owner:npg_l0AvnKfaqD1I@ep-twilight-sun-ay6cw76p-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
DEBUG=True
ALLOWED_HOSTS=*
SECRET_KEY=your_secret_key_here
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Seed the database:
```bash
python seed_data.py
```

7. Start the server:
```bash
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file with:
VITE_API_URL=http://localhost:8000/api
```

4. Start the development server:
```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Deployment

### Backend (Render)
- **URL**: https://cleanconnectuganda.onrender.com
- **Environment Variables Required**:
  - `DATABASE_URL` - Neon PostgreSQL connection string
  - `GEMINI_API_KEY` - Google Gemini API key
  - `DEBUG=False`
  - `ALLOWED_HOSTS=.onrender.com`

### Frontend (Render)
- **URL**: https://cleanconnect-frontend-c8xm.onrender.com
- **Environment Variables Required**:
  - `VITE_API_URL=https://cleanconnectuganda.onrender.com/api`

### Database (Neon)
- **Type**: PostgreSQL (cloud-hosted)
- **Provider**: Neon.tech
- **Connection**: Remote, accessible from anywhere

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user
- `GET /api/auth/profile/` - Get user profile

### Services
- `GET /api/services/` - List all service categories

### AI Features
- `POST /api/ai/assign/` - AI auto-assign partner and calculate price
- `POST /api/ai/chat/` - AI chatbot (Gemini-powered)
- `GET /api/ai/forecast/` - Demand forecasting

### Bookings
- `POST /api/bookings/` - Create booking
- `GET /api/bookings/` - List user's bookings

### Payments
- `POST /api/payments/` - Process payment

## Key Features Explained

### AI Partner Matching
The system automatically selects the best partner using a scoring algorithm that considers:
- Partner rating (40% weight)
- Distance from customer (30% weight)
- Availability (15% weight)
- Completion rate (10% weight)
- Experience/total bookings (5% weight)

### Pricing Algorithm
Base price is calculated from:
- Service type base rate
- Number of rooms (additional rooms cost extra)
- Number of bathrooms
- Location demand multiplier
- Urgency multiplier

Then discounts are applied:
- 5% automatic discount for female users
- 10% discount for scheduled bookings
- Dynamic pricing based on demand

### Gemini AI Chatbot
Integrated Google Gemini 3.6 Flash for natural language conversations. The chatbot:
- Answers any question (not just cleaning-related)
- Maintains conversation context
- Provides helpful suggestions
- Falls back gracefully if API fails

## Test Accounts

- **Customer (Female)**: aisha_demo / customer123 (gets 5% discount)
- **Partner**: sparklehome / partner123
- **Admin**: admin / admin123

## License

This project is proprietary software developed for CleanConnect Uganda.

## Team

Developed by GirlCode Visionaries