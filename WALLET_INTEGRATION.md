# Wallet Integration & Configuration Guide

## Overview
This document outlines the wallet integration, logo implementation, image slider setup, and investment disclaimer added to the Powabitz platform.

## Wallet Addresses

### Integrated Networks
- **BNB Smart Chain**: `0xab9786e43abb8351b3dbfc31588264facf902bca`
- **Ethereum**: `0xab9786e43abb8351b3dbfc31588264facf902bca`

## Frontend Implementation

### 1. Logo Integration
- **File**: `public/powabitz-logo.svg`
- **Usage**: Logo is now displayed in the header navigation
- **Implementation**: Updated `components/Header.tsx` to use the PowaBitz SVG logo instead of a placeholder

### 2. Image Slider with Real Images
The image slider now displays meaningful images with the following slides:

1. **AI Trading Robot** (`robots-2.jpg`)
   - Title: "Invest & Grow Your Crypto"
   - Shows advanced AI-powered trading visualization

2. **Secure Finance** (`secure-finance-illustration.png`)
   - Title: "Secure & Protected"
   - Demonstrates security and trust with lock and shield imagery

3. **Digital Trading Technology** (`digital-trading-technology.webp`)
   - Title: "Real-time Trading"
   - Shows hands-on holographic trading interface

4. **AI Trading Robot** (`ai-trading-robot.jpg`)
   - Title: "AI-Powered Trading"
   - Displays cutting-edge AI bot with trading interface

**File**: `components/ImageSlider.tsx`
- Auto-rotates every 5 seconds
- Manual navigation with arrow buttons
- Dot indicators for slide selection

### 3. Wallet Display Component
**File**: `components/WalletDisplay.tsx`

Features:
- Displays both BNB Smart Chain and Ethereum wallet addresses
- One-click copy-to-clipboard functionality
- Visual feedback on copy with icon change
- Responsive grid layout (1 col mobile, 2 cols desktop)
- Gradient icons for each network

### 4. Investment Disclaimer Component
**File**: `components/InvestmentDisclaimer.tsx`

Displays crucial information including:
- **Risk Warning**: Acknowledges market volatility
- **Investment Limit**: Clearly states to only invest what you can afford to lose
- **No Guarantees**: Clarifies returns are not guaranteed
- **Research Guidance**: Encourages due diligence
- **Professional Advice**: Recommends consulting financial advisors

Placement on Pages:
- Investment page (prominent position)
- Home page (before CTA section)

## Backend Implementation

### 1. Wallet Configuration
**File**: `backend/config/wallets.js`

Exports:
- `WALLETS` object with network details
- `getWalletAddresses()` - Returns all wallet addresses
- `getWalletByNetwork(network)` - Get specific network wallet
- `getWalletByChainId(chainId)` - Get wallet by chain ID

### 2. Wallet API Endpoint
**File**: `backend/routes/wallets.js`

New public endpoint:
```
GET /api/wallets/company-addresses
```

Returns company wallet addresses in JSON format.

## Frontend Configuration

### Wallet Config
**File**: `config/wallets.ts`

Exports:
- `WALLETS` constant with BNB and Ethereum addresses
- `WALLET_NETWORKS` array with network details
- Used by `WalletDisplay` component

## Real-time Integration

### Current Setup
1. **WebSocket Ready**: Backend server configured for real-time updates
2. **Wallet Monitoring**: Can be extended to monitor incoming deposits in real-time
3. **Price Updates**: Crypto prices stream in real-time via CryptoTicker component

### Future Real-time Enhancements
1. Monitor wallet addresses for incoming transactions
2. Auto-update user balances when crypto received
3. Real-time notifications for large deposits
4. Live exchange rate tracking

## Usage Instructions

### For Users
1. Visit the Investment page
2. See wallet addresses in the "Send Crypto to Our Wallets" section
3. Click "Copy Address" button to copy wallet address
4. Send crypto from their exchange/wallet
5. Address is automatically validated

### For Developers

**Access company wallets in frontend:**
```typescript
import { WALLET_NETWORKS } from '@/config/wallets';
```

**Access company wallets in backend:**
```javascript
import { getWalletAddresses } from './config/wallets.js';
```

**Get company wallets via API:**
```bash
curl http://localhost:5000/api/wallets/company-addresses
```

## Security Notes

1. **Wallet Addresses**: Currently hardcoded for simplicity
2. **Future Enhancement**: Move to environment variables
3. **Verification**: Always verify wallet addresses match Powabitz official documentation
4. **Monitoring**: Implement deposit monitoring to prevent fraud

## Database Integration

The Wallet model in MongoDB tracks:
- User deposit addresses
- Pending deposits
- Withdrawal history
- Balance history
- Transaction verification status

## Testing

To test wallet integration:

1. **Frontend**: Visit `/investment` page
2. **Backend**: Call `/api/wallets/company-addresses`
3. **Copy Function**: Click copy button to test clipboard functionality
4. **Disclaimer**: Scroll to see investment disclaimer on home and investment pages

## Environment Variables (Backend)

Add to `.env`:
```
WALLET_MONITOR_ENABLED=false
WALLET_CONFIRMATION_BLOCKS=6
```

These can be enabled for real-time wallet monitoring in future updates.

## Next Steps

1. ✅ Wallet addresses integrated
2. ✅ Logo implemented
3. ✅ Image slider with real images
4. ✅ Disclaimer added
5. ⏳ Set up wallet monitoring service
6. ⏳ Implement blockchain event listeners
7. ⏳ Add transaction verification system

---

**Last Updated**: 2026-03-30
**Version**: 1.0
