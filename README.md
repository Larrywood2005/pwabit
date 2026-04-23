# Powabitz - Crypto Investment Platform

A modern, mobile-first crypto investment platform with daily compound returns. Start investing with just $10 and earn 10% daily on your investments.

## ✨ Features

### For Users
- 💰 Minimum investment of $10
- 📈 10% daily compound returns
- 🔒 Secure crypto deposits/withdrawals
- 📱 Mobile-first responsive design
- 🎮 In-app activities ($0.50 daily rewards)
- ✅ Email & KYC verification
- 📊 Real-time portfolio tracking
- 🕐 24-hour trade placement
- 💳 Multiple crypto support (BTC, ETH, USDT, etc.)

### For Admins
- 👥 User management dashboard
- ✔️ KYC verification system
- 💵 Deposit confirmation & payouts
- 📋 Transaction management
- 📊 Platform analytics
- 🚨 Fraud detection tools
- 👁️ User wallet visibility

### Technical Features
- 🌐 Real-time crypto price ticker (WebSocket)
- ⚡ Daily automated returns scheduler
- 🔐 JWT authentication with email verification
- 📦 MongoDB database
- 📱 Mobile-optimized UI
- 🎨 Modern dark theme (neon blue/purple)
- 🚀 Next.js 16 frontend
- 🗄️ Express backend with real-time capabilities

## 🏗️ Architecture

```
Powabitz
├── Frontend (Next.js 16 + React 19)
│   ├── Public pages (Home, About, Contact, Investment)
│   ├── Authentication (Login, Register, Email Verify)
│   ├── User Dashboard (Investments, Wallet, Activities)
│   └── Admin Panel (Management & Analytics)
│
└── Backend (Node/Express + MongoDB)
    ├── Authentication APIs
    ├── Investment Management
    ├── User Management
    ├── WebSocket (Crypto Prices)
    ├── Schedulers (Daily Returns)
    └── Admin Operations
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or pnpm

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Update with your settings:
# - MONGODB_URI (MongoDB connection string)
# - JWT_SECRET (strong random string)
# - EMAIL credentials (Gmail/SendGrid)
# - COINGECKO_API_KEY (for crypto prices)
# - Wallet addresses for deposits

npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
# In project root
npm install

# Create .env.local (optional)
# NEXT_PUBLIC_API_URL=http://localhost:5000

npm run dev
# Frontend runs on http://localhost:3000
```

## 📖 Usage

### User Flow
1. **Sign Up** → Email verification → Create password
2. **KYC Verification** → Required for amounts > $300
3. **Choose Package** → Starter ($10+), Premium ($1000+), Elite ($5000+)
4. **Deposit Crypto** → Send to provided wallet address
5. **Earn Returns** → 10% daily credited automatically
6. **Trade** → Place trades after 24 hours
7. **Withdraw** → Request withdrawal anytime (pending admin confirmation)

### Admin Flow
1. **Login** → Admin dashboard
2. **Verify Users** → Review KYC submissions
3. **Confirm Deposits** → Validate crypto transfers
4. **Process Payouts** → Approve withdrawal requests
5. **Monitor Activity** → Track suspicious behavior
6. **View Analytics** → Platform statistics

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#00d4ff` | Main brand, CTAs |
| Secondary | `#a855f7` | Accents, highlights |
| Accent | `#c084fc` | Additional accents |
| Background | `#0f1419` | Main background |
| Card | `#1a1f2e` | Card surfaces |

### Typography
- **Font Family**: Geist (sans), Geist Mono (monospace)
- **Responsive**: 14px (mobile) → 64px (desktop)
- **Line Height**: 1.4-1.6

## 📱 Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🔐 Security

- ✅ JWT authentication with 7-day expiration
- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ Email verification required
- ✅ KYC verification for large investments
- ✅ Transaction verification on blockchain
- ✅ Rate limiting recommended
- ✅ CORS restricted to frontend domain
- ✅ Secure HTTP-only cookies option

## 📊 Investment Packages

| Package | Min | Max | Daily Return | Features |
|---------|-----|-----|--------------|----------|
| Starter | $10 | $999 | 10% | Basic support |
| Premium | $1,000 | $4,999 | 10% | Priority support |
| Elite | $5,000+ | Unlimited | 10% | VIP support |

All packages include:
- Daily compound returns
- 24-hour trading capability
- Real-time updates
- Withdrawal anytime

## 🌐 API Documentation

### Public Endpoints
- `GET /api/health` - Server status

### Auth Endpoints
- `POST /api/auth/register` - Create account
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Current user (authenticated)
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Reset password

### Investment Endpoints
- `POST /api/investments` - Create investment
- `GET /api/investments` - List user investments
- `GET /api/investments/:id` - Investment details
- `POST /api/investments/:id/trade` - Place trade
- `POST /api/investments/:id/withdraw` - Request withdrawal

### Admin Endpoints
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List users (paginated)
- `GET /api/admin/stats` - Platform statistics
- `POST /api/admin/verify-kyc/:userId` - Approve KYC
- `POST /api/admin/confirm-deposit/:id` - Confirm deposit
- `POST /api/admin/payout/:id` - Process payout
- `POST /api/admin/remove-user/:userId` - Block user

### Activity Endpoints
- `POST /api/activities/spin` - Daily spin
- `POST /api/activities/game` - Daily game
- `GET /api/activities` - Activity history
- `GET /api/activities/today` - Today's activities

### Wallet Endpoints
- `GET /api/wallets/my-wallet` - Wallet details
- `GET /api/wallets/deposit-addresses` - Deposit addresses
- `POST /api/wallets/add-custom-address` - Add address
- `GET /api/wallets/history` - Wallet history

## 🔄 Real-Time Features

### WebSocket for Crypto Prices
```javascript
// Connect
const ws = new WebSocket('ws://localhost:5000');

// Receive prices every 30 seconds
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'crypto_prices') {
    console.log(data); // { BTC: {...}, ETH: {...}, ... }
  }
};
```

### Daily Returns Scheduler
- Runs automatically at midnight UTC
- Credits 10% daily returns to all active investments
- Creates transaction records automatically
- Updates user balances in real-time

## 📦 Database Schema

### Collections
- **users** - User accounts with KYC status
- **investments** - Investment records
- **transactions** - All financial transactions
- **activities** - Daily activity rewards
- **wallets** - User wallet information
- **admins** - Administrator accounts

See `/backend/models/` for detailed schemas.

## 🧪 Test Accounts

### User
- Email: `user@example.com`
- Password: `password123`

### Admin
- Email: `admin@example.com`
- Password: `admin123`

## 📋 Environment Variables

### Backend
```env
MONGODB_URI=mongodb://localhost:27017/powabitz
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your_app_password
COINGECKO_API_KEY=your_api_key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_WALLET_BTC=1A1z7agoat...
APP_WALLET_ETH=0x742d35Cc...
APP_WALLET_USDT=0x742d35Cc...
```

## 🚢 Deployment

### Backend (Vercel, Railway, Heroku)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

### Frontend (Vercel, Netlify)
1. Connect GitHub repository
2. Set `NEXT_PUBLIC_API_URL` to backend URL
3. Deploy on push

### Database (MongoDB Atlas)
1. Create cluster
2. Get connection string
3. Add to `MONGODB_URI`

## 📈 Metrics & Analytics

- Total invested amount
- Number of active investors
- Total earnings generated
- Daily return statistics
- User growth trends
- Transaction volume
- KYC verification rates
- Withdrawal requests

## 🔄 Maintenance

### Regular Tasks
- Monitor MongoDB performance
- Check email delivery logs
- Review admin activities
- Analyze fraud patterns
- Update crypto price feeds
- Backup database regularly

### Monitoring
- Server health checks
- API response times
- WebSocket connection status
- Daily job execution logs
- Error tracking

## 🤝 Contributing

This is a production application. Changes should be:
1. Tested thoroughly
2. Reviewed by admin
3. Deployed to staging first
4. Monitored for issues

## 📄 License

Proprietary - All rights reserved

## 📞 Support

- **Email**: support@powabitz.com
- **Phone**: +1 (234) 567-890
- **Platform**: Global

## 🙏 Acknowledgments

- Built with Next.js 16 & React 19
- MongoDB for database
- Express for backend
- Tailwind CSS for styling
- Crypto prices from CoinGecko API

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready
