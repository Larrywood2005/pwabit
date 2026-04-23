# Powabitz Configuration Summary

## Critical Information - Save This!

### MongoDB Database
```
Connection String: mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz
Username: timrobertss201_db_user
Password: iis4you123
Database: Powabitz
```

### Admin Login
```
Email: admin@powabitz.com
Password: Admin@12345
URL: http://localhost:3000/admin
```

### Wallet Addresses
```
BNB Smart Chain: 0xab9786e43abb8351b3dbfc31588264facf902bca
Ethereum: 0xab9786e43abb8351b3dbfc31588264facf902bca
```

## Backend Environment Variables

Create `/backend/.env` with these values:

```env
# Database
MONGODB_URI=mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz
DATABASE_NAME=Powabitz

# Server
PORT=5000
NODE_ENV=development

# Admin
ADMIN_EMAIL=admin@powabitz.com
ADMIN_PASSWORD=Admin@12345

# JWT
JWT_SECRET=powabitz_super_secret_jwt_key_2024
JWT_EXPIRE=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Wallets
BNB_WALLET=0xab9786e43abb8351b3dbfc31588264facf902bca
ETH_WALLET=0xab9786e43abb8351b3dbfc31588264facf902bca

# Crypto API
COINGECKO_API_KEY=free_tier

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Quick Start Commands

### Start Backend
```bash
cd backend
npm install
cp .env.template .env
# Edit .env with values above
npm run dev
```

### Start Frontend
```bash
npm install
npm run dev
```

### Access Points
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Admin: `http://localhost:3000/admin`

## All Login Credentials

### Admin Account
- **Email**: admin@powabitz.com
- **Password**: Admin@12345

### Test User Account (After Registration)
- Create via `/auth/register`
- Default investment: $10-$999 (Starter)
- Daily returns: 10% compound

## Key Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/admin-login
POST /api/auth/verify-email
```

### Admin (Requires Auth)
```
GET /api/admin/users
GET /api/admin/deposits
GET /api/admin/payouts
PUT /api/admin/users/:id/verify
PUT /api/admin/kyc/:id/approve
POST /api/admin/deposits/confirm
POST /api/admin/payouts/process
```

### Investments
```
GET /api/investments/packages
POST /api/investments/create
GET /api/investments/user
POST /api/investments/trade
```

### Public
```
GET /api/wallets/company-addresses
GET /api/crypto/prices (WebSocket)
```

## Features Status

### ✅ Implemented
- User registration & email verification
- Admin dashboard & controls
- 3 investment packages
- Daily compound returns (10%)
- KYC verification system
- Real-time crypto ticker
- Wallet integration (BNB, ETH)
- User dashboard with portfolio
- In-app activities ($0.5/day)
- Modern dark theme UI
- Mobile responsive design
- Image slider with 4 images
- Testimonials section
- Investment disclaimer
- Compact button layout (fixed)

### 🔄 Ready for
- Email notifications (configure SMTP)
- 2FA authentication
- Advanced analytics
- Mobile app
- Additional crypto networks

## File References

Key files to know:
- Admin UI: `/app/admin/page.tsx`
- Admin API: `/backend/routes/admin.js`
- Database Models: `/backend/models/`
- Services: `/backend/services/`
- Components: `/components/`
- Investment Page: `/app/investment/page.tsx`

## Important Notes

1. **Security**: Change admin password immediately after first login
2. **Database**: Backup regularly
3. **Email**: Configure SMTP for user verification
4. **API Keys**: Set up Binance API if needed
5. **Monitoring**: Set up alerts for transaction issues
6. **Compliance**: Ensure KYC is enforced for amounts > $300

## Common Tasks

### Add New Admin User
```bash
# Use admin dashboard or API
POST /api/admin/create-admin
{
  "email": "newadmin@powabitz.com",
  "password": "Strong@Password"
}
```

### Verify User in Database
```bash
# Via MongoDB Atlas or CLI
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { verified: true } }
)
```

### Process Manual Payout
```bash
# Via admin dashboard
POST /api/admin/payouts/process
{
  "userId": "...",
  "amount": 1000,
  "type": "withdrawal"
}
```

## Deployment Checklist

- [ ] Update admin password
- [ ] Configure production JWT secret
- [ ] Set up email service (SMTP)
- [ ] Configure production database
- [ ] Set HTTPS/SSL certificates
- [ ] Update CORS origins
- [ ] Set up monitoring/alerts
- [ ] Configure backup strategy
- [ ] Enable rate limiting
- [ ] Set up CDN for static assets
- [ ] Configure analytics
- [ ] Test all admin functions
- [ ] Test all user workflows
- [ ] Security audit

## Support & Documentation

- `SETUP_GUIDE.md` - Detailed setup instructions
- `ADMIN_CREDENTIALS.md` - Admin access info
- `README.md` - Project overview
- `IMPLEMENTATION_GUIDE.md` - Technical details
- `QUICK_START.md` - 5-minute start guide
