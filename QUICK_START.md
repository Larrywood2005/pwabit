# Powabitz - Quick Start Guide

Get your Powabitz crypto investment platform up and running in 5 minutes!

## 📋 Prerequisites

- Node.js 18+
- MongoDB (local or cloud - MongoDB Atlas)
- npm or pnpm
- Gmail account (for email verification) or SendGrid

## ⚡ Fast Setup

### Step 1: Clone & Install Backend (2 minutes)

```bash
cd backend
npm install
```

### Step 2: Configure Backend (.env)

Create `/backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/powabitz
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
COINGECKO_API_KEY=free_api_key_from_coingecko
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_WALLET_BTC=1A1z7agoat2GJXHLJ5ysR3hWa8mAP5sfJg
APP_WALLET_ETH=0x742d35Cc6634C0532925a3b844Bc9e7595f87456
APP_WALLET_USDT=0x742d35Cc6634C0532925a3b844Bc9e7595f87456
```

**Get Email Password:**
1. Enable 2FA on Gmail
2. Generate app password: https://myaccount.google.com/apppasswords
3. Copy password to `.env`

**Get CoinGecko API Key:**
1. Visit https://www.coingecko.com/api
2. Free tier doesn't require key (leave blank or use free endpoint)

### Step 3: Start Backend (1 minute)

```bash
npm run dev
# Expected output: "Server running on http://localhost:5000"
```

### Step 4: Install & Start Frontend (1 minute)

In a new terminal:

```bash
# From project root
npm install
npm run dev
# Expected output: "ready - started server on 0.0.0.0:3000"
```

### Step 5: Access the App (1 minute)

Open in your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/health
- **Admin Dashboard**: http://localhost:3000/admin

---

## 🧪 Test the Platform

### User Sign Up
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in details:
   - Name: John Doe
   - Email: john@example.com
   - Phone: +1 (234) 567-8900
   - Password: Test123!@
4. Click next → Confirm password → Agree terms → Create Account

### User Dashboard
1. Click "Sign In"
2. Use: john@example.com / Test123!@
3. View dashboard at http://localhost:3000/dashboard

### Create Investment
1. From dashboard, click "Create Investment"
2. Select Starter package ($10-$999)
3. Input amount: $100
4. Submit (status will be "pending")

### Admin Review
1. Go to http://localhost:3000/admin
2. See pending deposits
3. Click "Review" to confirm deposit
4. Investment status changes to "active"
5. User starts earning 10% daily

---

## 🎨 UI Overview

### Pages You Can Visit

**Public:**
- `/` - Home page with hero & slider
- `/investment` - Investment packages
- `/about` - Company info
- `/contact` - Contact form

**Auth:**
- `/auth/login` - Sign in
- `/auth/register` - Sign up
- `/auth/forgot-password` - Password reset

**User (After Login):**
- `/dashboard` - Overview
- `/dashboard/investments` - Manage investments
- `/dashboard/wallet` - Crypto wallet
- `/dashboard/activities` - Daily rewards
- `/dashboard/settings` - Account settings

**Admin:**
- `/admin` - Admin dashboard

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error: MongoDB connection failed**
```
Solution: Ensure MongoDB is running
# If local: mongod
# Or use MongoDB Atlas cloud URL
```

**Error: Port 5000 already in use**
```
Solution: Kill process or change PORT in .env
# On macOS/Linux: lsof -ti:5000 | xargs kill -9
# On Windows: netstat -ano | findstr :5000
```

**Error: Email verification not working**
```
Solution: Check EMAIL credentials in .env
# Make sure you're using app password, not Gmail password
```

### Frontend Won't Start

**Error: Port 3000 already in use**
```
Solution: npm run dev -- -p 3001
```

**Error: API calls failing (CORS)**
```
Solution: Ensure backend is running on port 5000
# Check http://localhost:5000/api/health
```

### MongoDB Issues

**Using local MongoDB:**
```bash
# Start MongoDB server
mongod

# Or use MongoDB Atlas (cloud)
# Get connection string from: https://www.mongodb.com/cloud/atlas
```

---

## 📊 Real-Time Features

### Live Crypto Ticker
- Automatically updates prices
- Shows BTC, ETH, USDT, SOL, ADA, XRP
- Updates every 30 seconds
- Uses mock data (connect CoinGecko for real)

### Daily Returns
- Runs at midnight UTC
- Credits 10% of investment + previous earnings
- Automatic transaction logging
- Updates user balance in real-time

### WebSocket Connection
- Real-time price updates
- Connection: `ws://localhost:5000`
- Auto-reconnect enabled

---

## 💾 Database

### MongoDB Collections Created:
1. **users** - User accounts & KYC
2. **investments** - Investment records
3. **transactions** - All transactions
4. **activities** - Daily activity rewards
5. **wallets** - Wallet information
6. **admins** - Admin accounts

### View Data (MongoDB Compass)
1. Download: https://www.mongodb.com/products/tools/compass
2. Connect to: mongodb://localhost:27017
3. View collections under "powabitz" database

---

## 🚀 Key Test Scenarios

### Scenario 1: User Journey
1. Register → Email verify → Login
2. Create investment → Pay to wallet
3. Admin confirms deposit
4. Investment becomes active
5. See daily returns compound
6. Request withdrawal

### Scenario 2: Admin Workflow
1. Login to admin
2. See pending KYC/deposits
3. Review user documents
4. Confirm or reject
5. Monitor platform stats

### Scenario 3: Real-Time Updates
1. Open 2 browser windows
2. Window 1: User dashboard
3. Window 2: Admin dashboard
4. Create investment in window 1
5. Confirm in window 2 (instantly updates window 1)

---

## 📱 Mobile Testing

### Responsive Design
- Mobile: < 640px (hamburger menu)
- Tablet: 640px - 1024px
- Desktop: > 1024px

Test by:
```
F12 → Device Emulation
Device: iPhone 12, iPad, Desktop
```

---

## 🛠️ Development Commands

### Backend
```bash
npm run dev       # Start with nodemon (auto-restart)
npm start         # Start production
```

### Frontend
```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm start         # Start production build
npm run lint      # Check code style
```

---

## 🔑 API Quick Reference

### Health Check
```bash
curl http://localhost:5000/api/health
```

### User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"John Doe",
    "email":"john@example.com",
    "password":"Test123!",
    "phone":"+1234567890"
  }'
```

### User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"Test123!"
  }'
```

### Create Investment
```bash
curl -X POST http://localhost:5000/api/investments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "packageId":"starter",
    "amount":100
  }'
```

---

## 📚 Additional Resources

### Documentation Files
- `README.md` - Full project documentation
- `PROJECT_SUMMARY.md` - Feature overview
- `IMPLEMENTATION_GUIDE.md` - Technical details

### External Links
- MongoDB: https://www.mongodb.com
- Next.js: https://nextjs.org
- Express: https://expressjs.com
- Tailwind: https://tailwindcss.com

---

## ✅ Checklist

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:3000
- [ ] MongoDB connected
- [ ] Can view home page
- [ ] Can register new user
- [ ] Can login
- [ ] Can create investment
- [ ] Admin can confirm deposit
- [ ] See investment as active
- [ ] Live crypto ticker working
- [ ] Mobile view responsive

---

## 🎉 You're Ready!

Your Powabitz platform is now running locally. You can:
- ✅ Create user accounts
- ✅ Invest in crypto
- ✅ Earn daily returns
- ✅ Manage as admin
- ✅ Track investments
- ✅ Process payouts

### Next Steps:
1. Explore the UI
2. Test all features
3. Read full documentation
4. Deploy to production
5. Set up monitoring

---

**Need Help?**
Check `IMPLEMENTATION_GUIDE.md` or `PROJECT_SUMMARY.md` for detailed information.

**Ready to Deploy?**
See the Deployment section in `README.md`

Happy investing! 🚀📈💰
