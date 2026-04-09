import axios from 'axios';
import { broadcastCryptoPrices } from '../server.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Crypto symbols to track
const cryptoIds = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  tether: 'USDT',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
  ripple: 'XRP',
  cardano: 'ADA',
  solana: 'SOL'
};

export const fetchCryptoPrices = async (retries = 3) => {
  try {
    const ids = Object.keys(cryptoIds).join(',');
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_price_change_percentage: true
      },
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const prices = {};
    for (const [coinId, symbol] of Object.entries(cryptoIds)) {
      const data = response.data[coinId];
      prices[symbol] = {
        symbol,
        price: data.usd,
        marketCap: data.usd_market_cap,
        volume24h: data.usd_24h_vol,
        change24h: data.usd_24h_change,
        timestamp: new Date()
      };
    }
    
    console.log('[CryptoService] Prices fetched successfully');
    return prices;
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
      console.warn(`[CryptoService] Connection error, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return fetchCryptoPrices(retries - 1);
    }
    console.error('[CryptoService] Error fetching prices:', error.message);
    return null;
  }
};

// Start real-time price updates
export const startPriceUpdates = async () => {
  // Fetch prices every 30 seconds
  setInterval(async () => {
    const prices = await fetchCryptoPrices();
    if (prices) {
      broadcastCryptoPrices(prices);
    }
  }, 30000); // 30 seconds
  
  // Initial fetch
  const initialPrices = await fetchCryptoPrices();
  if (initialPrices) {
    broadcastCryptoPrices(initialPrices);
  }
};

// Get historical data
export const getCryptoHistory = async (coinId, days = 30, retries = 3) => {
  try {
    const response = await axios.get(
      `${COINGECKO_API}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days,
          interval: 'daily'
        },
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data.prices;
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
      console.warn(`[CryptoService] Connection error fetching history, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return getCryptoHistory(coinId, days, retries - 1);
    }
    console.error('[CryptoService] Error fetching history:', error.message);
    return null;
  }
};

export default {
  fetchCryptoPrices,
  startPriceUpdates,
  getCryptoHistory
};
