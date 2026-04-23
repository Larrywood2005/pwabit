# Powabitz Crypto Investment Platform - Implementation Guide

## 🎯 Project Overview
Powabitz is a modern crypto investment platform with daily compound returns of 10%. It features a complete user dashboard, admin panel, real-time crypto price tracking, and secure investment management.

## 📁 Project Structure

### Backend (`/backend`)
```
backend/
├── server.js                  # Main Express server with WebSocket setup
├── package.json              # Backend dependencies
├── .env.example             # Environment variables template
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── User.js              # User schema with KYC
│   ├── Investment.js        # Investment tracking
│   ├── Transaction.js       # All transactions
│   ├── Activity.js          # Daily activities/rewards
│   ├── Admin.js             # Admin accounts
│   └── Wallet.js            # Wallet management
├── routes/
│   ├── auth.js              # Authentication (register, login, email verify)
│   ├── investments.js       # Investment management
│   ├── admin.js             # Admin operations
│   ├── activities.js        # Activity rewards
│   └── wallets.js           # Wallet operations
├── middleware/
│   └── auth.js              # JWT authentication
└── services/
    ├── cryptoService.js     # Real-time crypto prices
    ├── returnsService.js    # Daily returns calculation
    └── activityService.js   # Activity reward system
```

### Frontend (`/app`)
```
app/
├── page.tsx                 # Home page with hero + image slider
├── investment/page.tsx      # Investment packages
├── about/page.tsx           # About page
├── contact/page.tsx         # Contact form
├── auth/
│   ├── login/page.tsx       # Login page
│   ├── register/page.tsx    # Registration (2-step)
│   ├── forgot-password/     # Password reset
│   └── layout.tsx           # Auth layout
├── dashboard/
│   ├── page.tsx            # Dashboard overview
│   ├── investments/        # Investment management
│   ├── wallet/            # Wallet management
│   ├── activities/        # Activities page
│   ├── settings/          # User settings
│   └── layout.tsx         # Dashboard layout
├── admin/
│   └── page.tsx           # Admin dashboard
├── globals.css            # Dark theme with crypto colors
└── layout.tsx             # Root layout

components/
├── Header.tsx             # Navigation header
├── Footer.tsx             # Footer with social links
├── ImageSlider.tsx        # Home page image carousel
└── CryptoTicker.tsx       # Live crypto prices
```

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your MongoDB URI and JWT secret
npm run dev
```

### Frontend Setup
```bash
npm install
npm run dev
```

## 🔑 Key Features

### User Features
- ✅ Email-verified registration (2-step process)
- ✅ KYC verification (required for investments > $300)
- ✅ Investment packages ($10, $1000, $5000 minimum)
- ✅ Daily 10% compound returns
- ✅ 24-hour trade placement
- ✅ Crypto deposit/withdrawal
- ✅ In-app activities ($0.5 daily max)
- ✅ Real-time crypto price ticker
- ✅ Investment portfolio tracking
- ✅ Withdrawal requests

### Admin Features
- ✅ User management and verification
- ✅ KYC review and approval
- ✅ Deposit confirmation
- ✅ Payout processing
- ✅ Wallet address management
- ✅ Fraud detection (remove suspected users)
- ✅ Platform analytics
- ✅ Activity logging

### Technical Features
- ✅ Real-time crypto prices via WebSocket
- ✅ Daily compound returns scheduler
- ✅ JWT authentication with email verification
- ✅ MongoDB with strict schemas
- ✅ Mobile-first responsive design
- ✅ Modern dark theme (neon blue/purple)
- ✅ Glassmorphism effects

## 🎨 Design System

### Color Palette
- **Primary**: `#00d4ff` (Neon Blue) - Main brand color
- **Secondary**: `#a855f7` (Neon Purple) - Accents
- **Accent**: `#c084fc` (Light Purple) - Highlights
- **Background**: `#0f1419` (Dark) - Main background
- **Card**: `#1a1f2e` (Slightly lighter dark) - Card backgrounds

### Typography
- **Fonts**: Geist (sans), Geist Mono (mono)
- **Headlines**: Bold, 24-64px
- **Body**: Regular, 14-16px
- **Line height**: 1.4-1.6

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Investments
- `POST /api/investments` - Create investment
- `GET /api/investments` - List user investments
- `GET /api/investments/:id` - Get investment details
- `POST /api/investments/:id/trade` - Place trade
- `POST /api/investments/:id/withdraw` - Request withdrawal

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List users (paginated)
- `GET /api/admin/users/:id` - User details with investments
- `POST /api/admin/verify-kyc/:userId` - Verify KYC
- `POST /api/admin/confirm-deposit/:transactionId` - Confirm deposit
- `POST /api/admin/payout/:transactionId` - Process payout
- `POST /api/admin/remove-user/:userId` - Block user
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/deposits/pending` - Pending deposits
- `GET /api/admin/kyc/pending` - Pending KYC
- `GET /api/admin/wallets` - User wallets

### Activities
- `POST /api/activities/spin` - Daily spin
- `POST /api/activities/game` - Daily game
- `POST /api/activities/login-bonus` - Login bonus
- `GET /api/activities` - All activities
- `GET /api/activities/today` - Today's activities

### Wallets
- `GET /api/wallets/my-wallet` - User wallet
- `GET /api/wallets/deposit-addresses` - Deposit addresses
- `POST /api/wallets/add-custom-address` - Add custom address
- `GET /api/wallets/custom-addresses` - Custom addresses
- `GET /api/wallets/history` - Wallet history

## 🔒 Security

- JWT-based authentication with expiration
- Password hashing with bcryptjs
- Email verification required
- KYC verification for large investments
- Row-level security considerations
- Blockchain transaction verification
- Rate limiting on API endpoints (recommended: add express-rate-limit)
- CORS enabled for frontend URL only

## 📱 Mobile Optimization
- Mobile-first design approach
- Responsive grid layouts
- Touch-friendly buttons (min 44px)
- Optimized images and lazy loading
- Hamburger menu for mobile navigation
- Bottom navigation for mobile dashboards

## 🔄 Real-Time Features

### WebSocket Connection
- Subscribe to crypto price updates every 30 seconds
- Connect: `ws://localhost:5000`
- Receive: `{ type: 'crypto_prices', data: {...} }`

### Daily Returns Scheduler
- Runs at midnight UTC
- Automatically credits daily returns
- Creates transaction records
- Updates user balance

## 📋 Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/powabitz
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=app_password
COINGECKO_API_KEY=your_key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_WALLET_BTC=1A1z7agoat...
APP_WALLET_ETH=0x742d35Cc...
APP_WALLET_USDT=0x742d35Cc...
```

## 🧪 Testing Accounts

### User Account
- Email: `user@example.com`
- Password: `password123`

### Admin Account
- Email: `admin@example.com`
- Password: `admin123`

## 🚢 Deployment

### Backend Deployment (Vercel/Railway)
1. Set environment variables in hosting platform
2. Deploy with `npm run dev`
3. MongoDB Atlas for database
4. Use email service API (SendGrid, Mailgun)

### Frontend Deployment (Vercel)
1. Connect GitHub repository
2. Set environment variables (NEXT_PUBLIC_API_URL)
3. Deploy on every push to main

## 📚 Additional Notes

- All passwords are hashed with bcryptjs
- Email verification tokens expire in 24 hours
- Investments locked for first 7 days
- Daily returns calculated at midnight UTC
- Minimum withdrawal amount: $10
- Maximum withdrawal: user's full balance + earnings
- Network fees deducted from withdrawal amount
- All transactions stored in MongoDB for audit trail

## 🛠 Future Enhancements

- Two-factor authentication (2FA)
- Referral program with bonuses
- API webhooks for transaction notifications
- Mobile app (React Native)
- Advanced analytics dashboard
- Automated compliance reporting
- Multi-signature wallet support
- Cold/Hot wallet segregation

---

**Last Updated**: March 2026
**Version**: 1.0.0
