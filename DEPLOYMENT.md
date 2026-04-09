# Powabitz - Deployment Guide

Deploy your Powabitz platform to production with this comprehensive guide.

## 🏗️ Architecture for Production

```
┌─────────────────────────────────────────┐
│         Vercel (Frontend)               │
│  - Next.js 16 with React 19             │
│  - CDN + Edge Functions                 │
│  - Automatic deployment on git push     │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS API Calls
               │
┌──────────────▼──────────────────────────┐
│    Backend (Railway/Heroku/Render)      │
│  - Express.js server                    │
│  - WebSocket for real-time updates      │
│  - Automated schedulers                 │
└──────────────┬──────────────────────────┘
               │
               │ Connection
               │
┌──────────────▼──────────────────────────┐
│   MongoDB Atlas (Database)              │
│  - Cloud-hosted MongoDB                 │
│  - Automatic backups                    │
│  - Scalable clusters                    │
└─────────────────────────────────────────┘
```

---

## 📝 Pre-Deployment Checklist

- [ ] Code tested locally
- [ ] Environment variables documented
- [ ] Database backups configured
- [ ] Email service configured
- [ ] API keys obtained (CoinGecko)
- [ ] SSL certificates ready
- [ ] Domain name ready
- [ ] Error tracking setup (Sentry)
- [ ] Monitoring configured
- [ ] Database indexes created
- [ ] Rate limiting configured
- [ ] CORS properly configured

---

## 🚀 Step-by-Step Deployment

### Part 1: Database Setup (MongoDB Atlas)

#### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Click "Create" → "Build a Cluster"
4. Choose "M0 Free" (sufficient for testing)

#### 2. Configure Cluster
1. Choose cloud provider (AWS/GCP/Azure)
2. Choose region closest to you
3. Name: `powabitz-cluster`
4. Click "Create Cluster"

#### 3. Setup Network Access
1. Go to "Network Access"
2. Add IP Address:
   - For development: Add your IP
   - For production: Add `0.0.0.0/0` (allow all)
3. Click "Confirm"

#### 4. Create Database User
1. Go to "Database Access"
2. Click "Add New Database User"
3. Username: `powabitz_admin`
4. Password: Generate strong password
5. Built-in Roles: `readWriteAnyDatabase`
6. Click "Add User"

#### 5. Get Connection String
1. Go to "Clusters"
2. Click "Connect"
3. Choose "Connect your application"
4. Copy connection string
5. Replace:
   - `<username>`: `powabitz_admin`
   - `<password>`: Your password
   - `myFirstDatabase`: `powabitz`

Example:
```
mongodb+srv://powabitz_admin:PASSWORD@powabitz-cluster.xxxxx.mongodb.net/powabitz?retryWrites=true&w=majority
```

---

### Part 2: Backend Deployment (Railway)

#### 1. Prepare Backend Code
```bash
cd backend
# Make sure package.json has start script
# "start": "node server.js"
```

#### 2. Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"

#### 3. Connect GitHub Repository
1. Authorize Railway to access GitHub
2. Select your Powabitz repository
3. Select `backend` directory as root
4. Click "Deploy"

#### 4. Configure Environment Variables
In Railway dashboard:
1. Go to project settings
2. Click "Variables"
3. Add each variable from `.env.example`:

```
MONGODB_URI = mongodb+srv://...
JWT_SECRET = your_strong_secret_key_here
JWT_EXPIRE = 7d
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your_email@gmail.com
EMAIL_PASSWORD = your_app_password
COINGECKO_API_KEY = (leave blank for free tier)
PORT = 5000
NODE_ENV = production
FRONTEND_URL = https://your-domain.com
APP_WALLET_BTC = 1A1z7agoat2GJXHLJ5ysR3hWa8mAP5sfJg
APP_WALLET_ETH = 0x742d35Cc6634C0532925a3b844Bc9e7595f87456
APP_WALLET_USDT = 0x742d35Cc6634C0532925a3b844Bc9e7595f87456
```

#### 5. Get Backend URL
1. Go to "Deployments"
2. Find public URL (e.g., `https://powabitz-backend.up.railway.app`)
3. Copy for frontend configuration

#### 6. Monitor Logs
```
In Railway Dashboard → Logs to check for errors
```

---

### Part 3: Frontend Deployment (Vercel)

#### 1. Prepare Frontend Code
Make sure root `package.json` has:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

#### 2. Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"

#### 3. Import Project
1. Select your GitHub repository
2. Choose root directory (default is fine)
3. Click "Import"

#### 4. Configure Environment Variables
In Vercel project settings:
1. Go to "Settings" → "Environment Variables"
2. Add:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

(Use the Railway URL from Part 2, Step 5)

#### 5. Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Get deployment URL (e.g., `https://powabitz.vercel.app`)

#### 6. Update Backend CORS
In Railway backend settings:
1. Update `FRONTEND_URL` to Vercel URL
2. Redeploy backend

---

### Part 4: Email Service Setup (SendGrid)

#### 1. Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Verify sender email

#### 2. Create API Key
1. Go to "Settings" → "API Keys"
2. Create new API key
3. Copy and store securely

#### 3. Update Backend
Update Railway environment variables:
```
EMAIL_HOST = smtp.sendgrid.net
EMAIL_PORT = 587
EMAIL_USER = apikey
EMAIL_PASSWORD = SG.your_api_key_here
```

---

### Part 5: Domain Configuration

#### 1. Vercel Custom Domain
1. In Vercel project settings
2. Go to "Domains"
3. Add your domain (e.g., `powabitz.com`)
4. Follow DNS configuration
5. Point to Vercel nameservers

#### 2. Backend Domain (Optional)
1. In Railway, go to "Public Networking"
2. Add custom domain for backend
3. Point to Railway URL

---

## 🔒 Security Checklist

### SSL/TLS
- [ ] HTTPS enabled on all domains
- [ ] SSL certificate auto-renewed
- [ ] No mixed content warnings

### Authentication
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Email verification working
- [ ] Password reset secured
- [ ] Admin panel protected

### Database
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Strong database password
- [ ] Regular backups enabled
- [ ] Connection string never in code

### API
- [ ] CORS restricted to frontend domain
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention

### Secrets
- [ ] No secrets in git
- [ ] All env vars in platform (not in code)
- [ ] API keys rotated regularly
- [ ] Sensitive data logged minimally

---

## 📊 Post-Deployment Setup

### 1. Monitor Application Health
```bash
# Check backend health
curl https://your-backend.railway.app/api/health

# Check frontend accessibility
https://your-domain.com
```

### 2. Setup Error Tracking (Sentry)

#### Sentry Configuration
1. Go to https://sentry.io
2. Sign up free account
3. Create project (select "Next.js" for frontend)
4. Get DSN key

#### Add to Frontend
```bash
npm install @sentry/nextjs
```

Update `next.config.js`:
```javascript
const withSentry = require('@sentry/nextjs').withSentry;

module.exports = withSentry({
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
```

#### Add to Backend
```bash
npm install @sentry/node
```

Update `server.js`:
```javascript
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### 3. Setup Performance Monitoring
- Enable Vercel Analytics
- Enable Railway performance monitoring
- Monitor WebSocket connections
- Track API response times

### 4. Configure Database Backups
In MongoDB Atlas:
1. Go to "Backup" section
2. Enable automatic backups
3. Set daily backup schedule
4. Configure backup retention

### 5. Setup Email Alerts
In Railway/Vercel:
1. Configure deployment notifications
2. Setup error alerts
3. Configure resource usage alerts
4. Setup performance alerts

---

## 🔄 Continuous Deployment

### GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: npm run deploy:prod
```

### Manual Deployment
For simple updates:
1. Push to main branch
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend
4. No downtime

---

## 📈 Scaling Considerations

### If Usage Grows:

**Database**
- Upgrade MongoDB Atlas cluster tier
- Add read replicas for performance
- Enable auto-scaling

**Backend**
- Increase Railway CPU/RAM
- Add load balancing
- Scale horizontally if needed

**Frontend**
- Vercel automatically scales
- CDN handles traffic spikes
- Enable ISR (Incremental Static Regeneration)

---

## 🆘 Troubleshooting

### Deployment Issues

**Error: "Cannot find module"**
```
Solution: npm install before deploying
Push package-lock.json to git
```

**Error: "Database connection failed"**
```
Solution: Check MONGODB_URI
Verify IP whitelist in MongoDB Atlas
Check username/password
```

**Error: "CORS error"**
```
Solution: Update FRONTEND_URL in backend
Verify NEXT_PUBLIC_API_URL in frontend
Ensure no trailing slashes
```

### Performance Issues

**Slow API responses**
```
Solution: Check database indexes
Monitor MongoDB performance
Upgrade database tier
Add caching
```

**WebSocket disconnecting**
```
Solution: Check Railway stability
Verify WebSocket configuration
Monitor connection logs
```

---

## 🧪 Testing Production

### Health Checks
```bash
# Backend health
curl https://your-backend.railway.app/api/health

# Frontend accessibility
curl https://your-domain.com

# Database connection
# Check Railway logs
```

### User Journey Test
1. Register new account
2. Verify email (check inbox)
3. Login
4. Create investment
5. View dashboard
6. Admin approves
7. See investment active

### Admin Test
1. Login as admin
2. Verify pending users
3. Confirm deposits
4. Process payouts
5. View analytics

---

## 📋 Deployment Checklist (Final)

- [ ] Database setup complete
- [ ] Backend deployed & running
- [ ] Frontend deployed & running
- [ ] Domain configured
- [ ] SSL/HTTPS working
- [ ] Email service configured
- [ ] Environment variables set
- [ ] Error tracking enabled
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] User registration working
- [ ] Email verification working
- [ ] Investments creating successfully
- [ ] Admin dashboard accessible
- [ ] WebSocket connecting
- [ ] Daily returns scheduler running

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Next.js Docs**: https://nextjs.org/docs

---

## 🎉 You're Live!

Your Powabitz platform is now in production and accessible to users worldwide.

### Monitor regularly:
- Check error logs daily
- Monitor performance metrics
- Review user feedback
- Update dependencies monthly
- Backup database weekly

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Deployment Ready
