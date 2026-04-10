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

// Cache configuration
const priceCache = {
  data: null,
  timestamp: null,
  ttl: 60000 // 60 seconds - CoinGecko free tier has 10-50 calls/min limit
};

const historyCache = new Map();
const HISTORY_CACHE_TTL = 3600000; // 1 hour

// Rate limiting configuration
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 2000; // Minimum 2 seconds between API calls
let rateLimitBackoff = 1000; // Start with 1 second backoff
const MAX_BACKOFF = 60000; // Max 60 second backoff

// Check if price cache is still valid
const isCacheValid = () => {
  if (!priceCache.data || !priceCache.timestamp) return false;
  return Date.now() - priceCache.timestamp < priceCache.ttl;
};

// Calculate exponential backoff
const getBackoffDelay = (attempt) => {
  return Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF);
};

export const fetchCryptoPrices = async (retries = 3, attempt = 0) => {
  // Return cached data if still valid
  if (isCacheValid()) {
    console.log('[CryptoService] Using cached prices (age: ' + (Date.now() - priceCache.timestamp) + 'ms)');
    return priceCache.data;
  }

  // Rate limiting: ensure minimum interval between API calls
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
    const waitTime = MIN_FETCH_INTERVAL - timeSinceLastFetch;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    lastFetchTime = Date.now();
    const ids = Object.keys(cryptoIds).join(',');
    
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_price_change_percentage: true
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Powabitz-CryptoService/1.0'
      }
    });
    
    const prices = {};
    for (const [coinId, symbol] of Object.entries(cryptoIds)) {
      const data = response.data[coinId];
      if (data) {
        prices[symbol] = {
          symbol,
          price: data.usd,
          marketCap: data.usd_market_cap,
          volume24h: data.usd_24h_vol,
          change24h: data.usd_24h_change,
          timestamp: new Date()
        };
      }
    }
    
    // Update cache
    priceCache.data = prices;
    priceCache.timestamp = Date.now();
    rateLimitBackoff = 1000; // Reset backoff on success
    
    console.log('[CryptoService] Prices fetched successfully (' + Object.keys(prices).length + ' coins)');
    return prices;
  } catch (error) {
    // Handle rate limiting (429) with exponential backoff
    if (error.response?.status === 429) {
      const backoff = getBackoffDelay(attempt);
      console.warn(`[CryptoService] Rate limited (429). Backing off ${backoff}ms (attempt ${attempt + 1}/${retries})`);
      rateLimitBackoff = backoff;
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchCryptoPrices(retries, attempt + 1);
      }
    }
    
    // Handle network errors with exponential backoff
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
      const backoff = getBackoffDelay(attempt);
      console.warn(`[CryptoService] Connection error (${error.code}), backing off ${backoff}ms (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchCryptoPrices(retries - 1, attempt + 1);
    }
    
    console.error('[CryptoService] Error fetching prices:', error.message, `(Status: ${error.response?.status})`);
    
    // Return cached data if available, even if stale
    if (priceCache.data) {
      console.log('[CryptoService] Returning stale cached prices due to error');
      return priceCache.data;
    }
    
    return null;
  }
};

// Start real-time price updates with adaptive interval
export const startPriceUpdates = async () => {
  let updateInterval = 60000; // Start with 60 seconds
  
  const performUpdate = async () => {
    const prices = await fetchCryptoPrices();
    if (prices) {
      broadcastCryptoPrices(prices);
      // Reset interval on success
      updateInterval = 60000;
    } else {
      // Increase interval if API is having issues (adaptive backoff)
      updateInterval = Math.min(updateInterval * 1.5, 300000); // Max 5 minutes
      console.log('[CryptoService] Increased update interval to ' + updateInterval + 'ms due to fetch failure');
    }
  };
  
  // Schedule regular updates
  const updateScheduler = setInterval(performUpdate, updateInterval);
  
  // Re-evaluate interval periodically
  setInterval(() => {
    clearInterval(updateScheduler);
    setTimeout(() => {
      const newScheduler = setInterval(performUpdate, updateInterval);
      // Store reference for potential cleanup
      global.cryptoUpdateScheduler = newScheduler;
    }, 0);
  }, 300000); // Every 5 minutes, check and adjust
  
  // Perform initial fetch
  await performUpdate();
  
  console.log('[CryptoService] Price updates started (initial interval: ' + updateInterval + 'ms)');
};

// Get historical data with caching
export const getCryptoHistory = async (coinId, days = 30, retries = 3, attempt = 0) => {
  const cacheKey = `${coinId}_${days}`;
  
  // Check history cache
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL) {
    console.log('[CryptoService] Using cached history for ' + coinId);
    return cached.data;
  }
  
  // Rate limiting
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
    const waitTime = MIN_FETCH_INTERVAL - timeSinceLastFetch;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    lastFetchTime = Date.now();
    const response = await axios.get(
      `${COINGECKO_API}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days,
          interval: days > 90 ? 'daily' : undefined
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Powabitz-CryptoService/1.0'
        }
      }
    );
    
    const data = response.data.prices;
    
    // Cache the history
    historyCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log('[CryptoService] History fetched for ' + coinId);
    return data;
  } catch (error) {
    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429) {
      const backoff = getBackoffDelay(attempt);
      console.warn(`[CryptoService] Rate limited fetching history (429). Backing off ${backoff}ms`);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return getCryptoHistory(coinId, days, retries, attempt + 1);
      }
    }
    
    // Handle network errors
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
      const backoff = getBackoffDelay(attempt);
      console.warn(`[CryptoService] Connection error fetching history (${error.code}), backing off ${backoff}ms`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return getCryptoHistory(coinId, days, retries - 1, attempt + 1);
    }
    
    console.error('[CryptoService] Error fetching history:', error.message);
    
    // Return cached history if available
    if (cached) {
      console.log('[CryptoService] Returning stale cached history due to error');
      return cached.data;
    }
    
    return null;
  }
};

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of historyCache.entries()) {
    if (now - value.timestamp > HISTORY_CACHE_TTL) {
      historyCache.delete(key);
    }
  }
  console.log('[CryptoService] Cache cleanup completed. Active history caches: ' + historyCache.size);
}, 600000); // Every 10 minutes

export default {
  fetchCryptoPrices,
  startPriceUpdates,
  getCryptoHistory
};
