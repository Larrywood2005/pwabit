import { NextRequest, NextResponse } from 'next/server';

// Default balance response to prevent crashes
const DEFAULT_BALANCE_RESPONSE = {
  totalBalance: 0,
  availableBalance: 0,
  lockedInTrades: 0,
  pendingWithdrawal: 0,
  earnings: 0,
  powaUpBalance: 0,
  investments: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  totalEarnings: 0,
  totalInvested: 0,
  investmentReturns: 0,
  puzzleGameBonuses: 0,
  tradingBonuses: 0,
  referralEarnings: 0,
  activityEarnings: 0,
};

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    console.log('[API] Balance info request:', { 
      hasAuth: !!authHeader, 
      hasToken: !!token,
      backendUrl: process.env.NEXT_PUBLIC_API_URL 
    });

    if (!token) {
      console.log('[API] No token provided, returning default');
      return NextResponse.json(DEFAULT_BALANCE_RESPONSE);
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      console.log('[API] Fetching from backend:', `${backendUrl}/investments/balance/info`);
      
      const response = await fetch(`${backendUrl}/investments/balance/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[API] Backend response status:', response.status);

      if (!response.ok) {
        console.error('[API] Backend balance error:', response.status, response.statusText);
        return NextResponse.json(DEFAULT_BALANCE_RESPONSE);
      }

      const data = await response.json();
      
      console.log('[API] Backend balance data:', {
        totalBalance: data.totalBalance,
        availableBalance: data.availableBalance,
        lockedInTrades: data.lockedInTrades
      });
      
      // Ensure all values are non-negative numbers and pass through all balance fields
      // CRITICAL: Total Balance = Invested Capital + Earnings + Cash Balance
      // CRITICAL: Available Balance = What users can withdraw or use for PowaUp
      return NextResponse.json({
        // Main balances - FRONTEND SHOULD USE totalBalance FOR DISPLAY
        totalBalance: Math.max(0, data.totalBalance || 0),
        availableBalance: Math.max(0, data.availableBalance || 0),
        lockedInTrades: Math.max(0, data.lockedInTrades || 0),
        pendingWithdrawal: Math.max(0, data.pendingWithdrawal || 0),
        
        // Earnings breakdown
        earnings: Math.max(0, data.earnings || data.totalEarnings || 0),
        totalEarnings: Math.max(0, data.totalEarnings || 0),
        investmentReturns: Math.max(0, data.investmentReturns || 0),
        puzzleGameBonuses: Math.max(0, data.puzzleGameBonuses || 0),
        tradingBonuses: Math.max(0, data.tradingBonuses || 0),
        referralEarnings: Math.max(0, data.referralEarnings || 0),
        activityEarnings: Math.max(0, data.activityEarnings || 0),
        
        // Investment info
        totalInvested: Math.max(0, data.totalInvested || 0),
        investments: Math.max(0, data.investments || 0),
        
        // Account info
        powaUpBalance: Math.max(0, data.powaUpBalance || 0),
        totalDeposited: Math.max(0, data.totalDeposited || 0),
        totalWithdrawn: Math.max(0, data.totalWithdrawn || 0),
        
        // Metadata
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[API] Fetch error:', fetchError instanceof Error ? fetchError.message : fetchError);
      // Return default balance on network/timeout error
      return NextResponse.json(DEFAULT_BALANCE_RESPONSE);
    }
  } catch (error) {
    console.error('[API] Balance info error:', error instanceof Error ? error.message : error);
    // Always return default balance, never crash
    return NextResponse.json(DEFAULT_BALANCE_RESPONSE);
  }
}
