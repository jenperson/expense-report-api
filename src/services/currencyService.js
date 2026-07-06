const https = require('https');
const { getDb } = require('./database');

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const EXCHANGE_RATE_API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest';

// Cache exchange rates to avoid repeated API calls
let rateCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

async function getExchangeRate(fromCurrency, toCurrency = 'USD') {
  // If no API key is configured, assume 1:1 conversion (for development)
  if (!EXCHANGE_RATE_API_KEY) {
    console.warn('No EXCHANGE_RATE_API_KEY configured, using 1:1 conversion rates');
    return 1;
  }

  const cacheKey = fromCurrency + '_' + toCurrency;
  const now = Date.now();

  // Return cached rate if available and not expired
  if (rateCache[cacheKey] && now - cacheTimestamp < CACHE_TTL) {
    return rateCache[cacheKey];
  }

  try {
    const url = EXCHANGE_RATE_API_URL + '?app_id=' + EXCHANGE_RATE_API_KEY + '&base=' + fromCurrency;
    
    const rate = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.result === 'success' && result.rates) {
              const rate = result.rates[toCurrency];
              if (rate) {
                // Update cache
                rateCache[cacheKey] = rate;
                cacheTimestamp = now;
                resolve(rate);
              } else {
                console.error('No exchange rate found for ' + toCurrency + ' in response:', result);
                resolve(1); // Fallback to 1:1
              }
            } else {
              console.error('Exchange rate API error:', result);
              resolve(1); // Fallback to 1:1
            }
          } catch (e) {
            console.error('Failed to parse exchange rate response:', e);
            resolve(1); // Fallback to 1:1
          }
        });
      }).on('error', (err) => {
        console.error('Exchange rate API request failed:', err);
        resolve(1); // Fallback to 1:1
      });
    });

    return rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return 1; // Fallback to 1:1
  }
}

async function convertToUSD(amount, currency) {
  if (currency === 'USD') {
    return amount; // No conversion needed
  }

  const rate = await getExchangeRate(currency, 'USD');
  return amount * rate;
}

// Add amount_usd to existing expenses that don't have it
function backfillAmountUSD() {
  const db = getDb();
  
  // For existing expenses without amount_usd, set it to amount (assuming they're USD)
  const existing = db.prepare(
    'SELECT id, amount, currency FROM expenses WHERE amount_usd = 0'
  ).all();

  if (existing.length > 0) {
    console.log('Found ' + existing.length + ' expenses to update with amount_usd');
    
    for (const expense of existing) {
      const amountUSD = expense.currency === 'USD' ? expense.amount : expense.amount * 1; // Simple fallback
      db.prepare('UPDATE expenses SET amount_usd = ? WHERE id = ?')
        .run(amountUSD, expense.id);
    }
    
    console.log('Backfilled amount_usd for existing expenses');
  }
}

module.exports = { getExchangeRate, convertToUSD, backfillAmountUSD };