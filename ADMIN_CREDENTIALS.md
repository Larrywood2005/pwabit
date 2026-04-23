# Powabitz Admin Credentials & Configuration

## Admin Login Details

### Default Admin Account
- **Username/Email**: `admin@powabitz.com`
- **Password**: `Admin@12345`

### Admin Dashboard URL
```
Frontend: http://localhost:3000/admin
Backend API: http://localhost:5000/api/admin
```

## Database Configuration

### MongoDB Connection String
```
mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz
```

### Environment Setup
Add this to your backend `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/?appName=Powabitz
DATABASE_NAME=Powabitz

# Admin Credentials (for initialization)
ADMIN_EMAIL=admin@powabitz.com
ADMIN_PASSWORD=Admin@12345

# Server Configuration
PORT=5000
NODE_ENV=development
```

## First Time Setup

1. **Start the backend server**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with the MongoDB connection string above
   npm run dev
   ```

2. **Access Admin Dashboard**:
   - URL: `http://localhost:3000/admin`
   - Email: `admin@powabitz.com`
   - Password: `Admin@12345`

3. **Available Admin Functions**:
   - User verification and management
   - KYC approval for investments > $300
   - Deposit confirmation and processing
   - Payout management
   - View wallet addresses of all users
   - See funds generated from the app
   - Remove suspected users
   - Access admin analytics

## MongoDB Collections

The following collections will be created automatically:

1. **users** - User accounts and profiles
2. **investments** - Investment records with compound returns
3. **transactions** - All transaction history
4. **deposits** - Deposit records
5. **withdrawals** - Withdrawal requests and history
6. **activities** - In-app activity rewards ($0.5 daily max)
7. **wallets** - User wallet addresses
8. **admin_logs** - Admin action audit logs

## Testing Admin Features

### Via API (using Postman/curl):

**Admin Login**:
```bash
POST http://localhost:5000/api/auth/admin-login
Content-Type: application/json

{
  "email": "admin@powabitz.com",
  "password": "Admin@12345"
}
```

**Response** (you'll receive a JWT token):
```json
{
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "...",
    "email": "admin@powabitz.com",
    "role": "admin"
  }
}
```

## Security Notes

- Change the default admin password immediately after first login
- Create additional admin accounts for team members
- Use strong, unique passwords
- Enable 2FA if available
- Regularly audit admin logs
- Backup database regularly

## Frontend Admin Dashboard Access

The admin dashboard is accessible at:
```
http://localhost:3000/admin
```

Login with the credentials above, and you'll have access to:
- User management panel
- KYC verification interface
- Deposit/withdrawal approval system
- Payout processing
- Real-time analytics
- Fraud detection tools

## Database Management

### View MongoDB Data

Using MongoDB Atlas:
1. Go to https://cloud.mongodb.com
2. Log in with your MongoDB Atlas account
3. Navigate to the Powabitz cluster
4. Use MongoDB Compass or the web interface to view collections

### Direct Connection

Using MongoDB CLI:
```bash
mongosh "mongodb+srv://timrobertss201_db_user:iis4you123@powabitz.yrsuxow.mongodb.net/Powabitz"
```

## Troubleshooting

### Admin Login Issues
- Verify MongoDB connection is active
- Check that the user exists in the database
- Ensure passwords are correct
- Check backend server is running on port 5000

### Database Connection Issues
- Verify the connection string is correct
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity
- Verify credentials are correct

## Support

For admin-related issues, check:
1. `/backend/routes/admin.js` - Admin API routes
2. `/backend/middleware/auth.js` - Authentication middleware
3. `/app/admin/page.tsx` - Admin dashboard frontend
