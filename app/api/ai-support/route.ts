import { NextRequest, NextResponse } from 'next/server';

// Powabitz Company Information & AI Support Response Generator
const generateAIResponse = (userMessage: string, conversationHistory: any[] = []): string => {
  const lowerMessage = userMessage.toLowerCase();

  // About Powabitz
  if (lowerMessage.includes('about') || lowerMessage.includes('who') || lowerMessage.includes('what is powabitz')) {
    return 'Powabitz is a leading investment and trading platform offering crypto investments, automated bot trading, puzzle games, and multiple earning opportunities. We provide secure, fast, and transparent financial services with 24/7 support. Join thousands of users earning daily returns!';
  }

  // Investment packages - REAL INFO
  if (lowerMessage.includes('invest') || lowerMessage.includes('package') || lowerMessage.includes('plans')) {
    return 'Powabitz offers three investment packages:\n• BRONZE: $100-$500 (5% daily return)\n• SILVER: $500-$2,000 (8% daily return)\n• GOLD: $2,000+ (12% daily return)\n\nYou can invest in USD or NGN (₦1,420 per $1). Go to Dashboard > Invest to choose your package today!';
  }

  // Payment & Deposits
  if (lowerMessage.includes('payment') || lowerMessage.includes('deposit') || lowerMessage.includes('receipt')) {
    return 'Making a payment is simple:\n1) Select your investment package (Bronze, Silver, Gold)\n2) Choose currency: USD or NGN (₦1,420 = $1)\n3) Upload payment receipt (JPG, PNG, or PDF)\n4) Click "I Sent the Payment"\n\nYour investment is confirmed after admin verification (2-4 hours). You\'ll receive a confirmation email!';
  }

  // Profits & Earnings
  if (lowerMessage.includes('return') || lowerMessage.includes('profit') || lowerMessage.includes('earning') || lowerMessage.includes('gains')) {
    return 'Your profits include:\n✓ Daily Investment Returns (5-12% based on package)\n✓ Puzzle Game Bonuses\n✓ Daily Trading Bonuses\n✓ Referral Commissions\n\nAll profits are calculated REAL-TIME and added to your Total Earnings automatically. Withdraw anytime in real-time from Dashboard > Withdraw.';
  }

  // Withdrawals
  if (lowerMessage.includes('withdraw') || lowerMessage.includes('cash out') || lowerMessage.includes('payout')) {
    return 'Withdraw your profits anytime:\n• Minimum withdrawal: $10\n• Accepted methods: Crypto (Bitcoin, Ethereum, USDT) or Bank Transfer in NGN\n• Process time: 24-48 hours\n• NO withdrawal limits!\n\nGo to Dashboard > Withdraw to submit your request. Add your wallet/bank details first.';
  }

  // PowaUp Trading
  if (lowerMessage.includes('powaup') || lowerMessage.includes('trade') || lowerMessage.includes('bot')) {
    return 'PowaUp Credits enable automated bot trading:\n• Earn trading bonuses (up to 3% daily)\n• You get 30 FREE PowaUp credits on signup\n• Each bot trade uses 1 PowaUp\n• Purchase more credits from Dashboard > PowaUp\n• Real-time profit tracking & live trading rates';
  }

  // Puzzle Game
  if (lowerMessage.includes('puzzle') || lowerMessage.includes('game') || lowerMessage.includes('daily bonus')) {
    return 'Powabitz Puzzle Game:\n✓ Play daily puzzles to earn bonuses\n✓ Get 5 free attempts daily\n✓ Each correct solution = instant bonus\n✓ Bonuses added to your account in REAL-TIME\n✓ Combine with investment returns for maximum earnings!\n\nGo to Dashboard > Games to start playing!';
  }

  // KYC Verification
  if (lowerMessage.includes('kyc') || lowerMessage.includes('verification') || lowerMessage.includes('verify')) {
    return 'KYC verification requirements:\n• Valid government ID (passport, driver\'s license)\n• Selfie photo with your ID\n• Address proof (utility bill, bank statement)\n\nVerification takes 2-4 hours. Once approved, unlock higher investment limits and priority support. Go to Dashboard > KYC.';
  }

  // Account Security & Safety
  if (lowerMessage.includes('safe') || lowerMessage.includes('security') || lowerMessage.includes('protected')) {
    return 'Powabitz prioritizes your security:\n✓ Bank-level encryption for all transactions\n✓ Secure password requirements (16+ characters)\n✓ Two-factor authentication available\n✓ Regular security audits\n✓ 24/7 fraud monitoring\n✓ Instant suspension of suspicious accounts\n\nYour funds are always secure with Powabitz!';
  }

  // Account Issues
  if (lowerMessage.includes('suspend') || lowerMessage.includes('flag') || lowerMessage.includes('account status') || lowerMessage.includes('warning')) {
    return 'Account actions (suspension, flagging) are security measures:\n• Check your Dashboard for status alerts\n• Each action shows the reason & timestamp\n• Contact support@powabitz.com to appeal\n• Use this chat for assistance\n\nWe take user security seriously. If you have concerns, let us know!';
  }

  // Getting Help & Support
  if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
    return 'Powabitz Support Options:\n📞 Email: support@powabitz.com\n💬 Live Chat: Available in Dashboard\n📱 Use this chat for instant help\n🌐 FAQ & Tutorials: Dashboard > Help\n⏱️ Response time: Usually within 1 hour\n\nOur support team is ready to help 24/7!';
  }

  // How to Get Started
  if (lowerMessage.includes('how to') || lowerMessage.includes('tutorial') || lowerMessage.includes('guide') || lowerMessage.includes('start')) {
    return 'Getting started with Powabitz:\n1️⃣ Sign up (free & instant)\n2️⃣ Complete your profile\n3️⃣ Choose investment package\n4️⃣ Upload payment receipt\n5️⃣ Earn daily returns + bonuses!\n\nEach step takes just minutes. Your profits start accumulating immediately after admin approval!';
  }

  // Referral Program
  if (lowerMessage.includes('refer') || lowerMessage.includes('referral') || lowerMessage.includes('friend')) {
    return 'Powabitz Referral Program:\n• Earn 10% commission on referral deposits\n• Unlimited referrals = unlimited earnings\n• Commissions paid in real-time\n• Special bonuses for top referrers\n\nShare your referral link from Dashboard > Referrals. Your friends get welcome bonus too!';
  }

  // Minimum Investment
  if (lowerMessage.includes('minimum') || lowerMessage.includes('least') || lowerMessage.includes('smallest')) {
    return 'Powabitz minimum investment:\n🥉 BRONZE Package: $100 minimum\n🥈 SILVER Package: $500 minimum  \n🥇 GOLD Package: $2,000 minimum\n\nStart with any package that suits your budget. You can upgrade anytime. All payments accepted in USD or NGN!';
  }

  // Daily Returns
  if (lowerMessage.includes('daily') || lowerMessage.includes('every day') || lowerMessage.includes('24 hours')) {
    return 'Powabitz Daily Earnings:\n📊 Package Returns (Automatic):\n  • Bronze: 5% daily\n  • Silver: 8% daily\n  • Gold: 12% daily\n\n➕ Plus:\n  • Game bonuses\n  • Trading bonuses (PowaUp)\n  • Referral commissions\n\nAll calculated & added REAL-TIME. Check Dashboard > Total Earnings.';
  }

  // Greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'Hello! 👋 Welcome to Powabitz Support! I\'m here to help with:\n✓ Investment packages & returns\n✓ Payments & deposits\n✓ Withdrawals & cash-outs\n✓ Account security & status\n✓ Games & bonuses\n✓ Trading & PowaUp\n\nWhat can I help you with today?';
  }

  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return 'You\'re welcome! Happy to help. Is there anything else about Powabitz I can assist with?';
  }

  // Default response
  return 'Great question! Here are some popular topics:\n• Investment Packages & Returns\n• How to Make Deposits\n• Withdrawals & Payments\n• Puzzle Games & Bonuses\n• PowaUp Trading\n• Account Security\n\nAsk about any of these, or visit support@powabitz.com for more detailed assistance. What interests you most?';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate AI response using our intelligent system
    const reply = generateAIResponse(message, conversationHistory);

    return NextResponse.json({
      success: true,
      reply,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[v0] AI Support error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}
