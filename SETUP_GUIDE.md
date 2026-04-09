# Powabitz Setup Guide

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template and configure
cp .env.template .env
```

### Edit `.env` file with the following values:

```env
MONGODB_URI=mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz
DATABASE_NAME=Powabitz
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@powabitz.com
ADMIN_PASSWORD=Admin@12345
JWT_SECRET=powabitz_super_secret_jwt_key_2024
FRONTEND_URL=http://localhost:3000
BNB_WALLET=0xab9786e43abb8351b3dbfc31588264facf902bca
ETH_WALLET=0xab9786e43abb8351b3dbfc31588264facf902bca
```

```bash
# Start the backend server
npm run dev
```

Backend will be running at: `http://localhost:5000`

### 2. Frontend Setup

```bash
# In a new terminal, from the project root
npm install

# Start the development server
npm run dev
```

Frontend will be running at: `http://localhost:3000`

## Admin Access

### Login to Admin Dashboard
- **URL**: `http://localhost:3000/admin`
- **Email**: `admin@powabitz.com`
- **Password**: `Admin@12345`

### Admin API Endpoints

All admin endpoints require the admin JWT token from login.

**Admin Login**:
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@powabitz.com",
    "password": "Admin@12345"
  }'
```

**Get All Users** (Requires token):
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <token>"
```

**Verify User**:
```bash
curl -X PUT http://localhost:5000/api/admin/users/<userId>/verify \
  -H "Authorization: Bearer <token>"
```

**Approve KYC**:
```bash
curl -X PUT http://localhost:5000/api/admin/kyc/<userId>/approve \
  -H "Authorization: Bearer <token>"
```

## Database Configuration

### MongoDB Details
- **Connection String**: `mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz`
- **Username**: `timrobertss201_db_user`
- **Password**: `iis4you123`
- **Database**: `Powabitz`
- **Cluster**: `powabitz.yrsuxow.mongodb.net`

### Access MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Sign in to your MongoDB account
3. Select the Powabitz cluster
4. View collections and data

## File Structure

```
/vercel/share/v0-project/
├── app/                          # Next.js frontend
│   ├── page.tsx                  # Home page
│   ├── investment/page.tsx       # Investment packages
│   ├── about/page.tsx            # About page
│   ├── contact/page.tsx          # Contact page
│   ├── auth/
│   │   ├── login/page.tsx        # User login
│   │   └── register/page.tsx     # User registration
│   ├── dashboard/page.tsx        # User dashboard
│   └── admin/page.tsx            # Admin dashboard
├── components/                   # Reusable components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ImageSlider.tsx
│   ├── CryptoTicker.tsx
│   ├── WalletDisplay.tsx
│   ├── InvestmentDisclaimer.tsx
│   └── Testimonials.tsx
├── config/
│   └── wallets.ts                # Wallet configuration
├── backend/                      # Express.js backend
│   ├── models/                   # MongoDB schemas
│   │   ├── User.js
│   │   ├── Investment.js
│   │   ├── Transaction.js
│   │   ├── Activity.js
│   │   ├── Admin.js
│   │   └── Wallet.js
│   ├── routes/                   # API routes
│   │   ├── auth.js               # Auth endpoints
│   │   ├── investments.js        # Investment endpoints
│   │   ├── admin.js              # Admin endpoints
│   │   ├── activities.js         # Activity endpoints
│   │   └── wallets.js            # Wallet endpoints
│   ├── services/                 # Business logic
│   │   ├── cryptoService.js      # Crypto price & WebSocket
│   │   ├── returnsService.js     # Daily returns calculation
│   │   └── activityService.js    # Activity rewards
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── config/
│   │   ├── database.js           # MongoDB connection
│   │   └── wallets.js            # Wallet addresses
│   ├── server.js                 # Express app setup
│   └── .env                      # Environment variables
└── public/                       # Static assets
    └── powabitz-logo.svg        # Logo
```

## Features Checklist

### User Features
- [x] Email registration and verification
- [x] Login/logout
- [x] 3 investment packages ($10+, $1000+, $5000+)
- [x] KYC verification (required for deposits > $300)
- [x] Daily 10% compound returns
- [x] Place trades after 24 hours
- [x] Crypto deposits (BNB, ETH)
- [x] Withdraw earnings
- [x] In-app activities ($0.5 daily rewards)
- [x] Real-time crypto price ticker
- [x] User dashboard

### Admin Features
- [x] User verification
- [x] KYC approval for large investments
- [x] Deposit confirmation
- [x] Payout processing
- [x] View user wallet addresses
- [x] See total funds generated
- [x] Remove suspected users
- [x] Admin analytics
- [x] Audit logs

### Real-time Features
- [x] WebSocket for live crypto prices
- [x] Real-time investment updates
- [x] Live portfolio tracking

## Deployment

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy Backend to Render/Railway

1. Push code to GitHub
2. Connect to Render or Railway
3. Set environment variables
4. Deploy

## Troubleshooting

### MongoDB Connection Issues
```bash
# Test connection string
mongosh "mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/Powabitz"
```

### Port Already in Use
```bash
# Change port in .env or kill process
# On macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

### CORS Issues
- Update `FRONTEND_URL` in backend `.env`
- Ensure CORS middleware is configured in server.js

## API Documentation

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/verify-email` - Email verification
- POST `/api/auth/admin-login` - Admin login

### Investments
- GET `/api/investments/packages` - Get investment packages
- POST `/api/investments/create` - Create investment
- GET `/api/investments/user` - Get user investments
- POST `/api/investments/trade` - Place trade (after 24h)

### Admin
- GET `/api/admin/users` - Get all users
- PUT `/api/admin/users/<id>/verify` - Verify user
- PUT `/api/admin/kyc/<id>/approve` - Approve KYC
- POST `/api/admin/deposits/confirm` - Confirm deposit
- POST `/api/admin/payouts/process` - Process payout

### Wallets
- GET `/api/wallets/company-addresses` - Get Powabitz wallet addresses
- POST `/api/wallets/add` - Add user wallet
- GET `/api/wallets/user` - Get user wallet

## Next Steps

1. Update admin password after first login
2. Configure email service (SMTP)
3. Set up Binance API keys (optional)
4. Create additional admin accounts
5. Set up monitoring and alerts
6. Configure backup strategy
7. Plan marketing and user acquisition

## Support

For issues, refer to:
- `ADMIN_CREDENTIALS.md` - Admin login info
- `IMPLEMENTATION_GUIDE.md` - Technical details
- `README.md` - Project overview
