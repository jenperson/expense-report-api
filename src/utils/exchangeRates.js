const axios = require("axios");

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const EXCHANGE_RATE_API_URL = process.env.EXCHANGE_RATE_API_URL || "https://openexchangerates.org/api/latest.json";

// Simple in-memory cache for exchange rates (expires after 1 hour)
let rateCache = {
  rates: null,
  timestamp: null
};

async function fetchExchangeRates() {
  // Check if cache is valid (less than 1 hour old)
  if (rateCache.rates && rateCache.timestamp && Date.now() - rateCache.timestamp < 3600000) {
    return rateCache.rates;
  }

  if (!EXCHANGE_RATE_API_KEY) {
    console.warn("EXCHANGE_RATE_API_KEY not set. Using default rate of 1 for all currencies.");
    // Return default rates (1:1 for all currencies for testing)
    rateCache.rates = { USD: 1, EUR: 1.1, GBP: 1.3, JPY: 110 };
    rateCache.timestamp = Date.now();
    return rateCache.rates;
  }

  try {
    const response = await axios.get(EXCHANGE_RATE_API_URL, {
      params: { app_id: EXCHANGE_RATE_API_KEY }
    });
    rateCache.rates = response.data.rates;
    rateCache.timestamp = Date.now();
    return rateCache.rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error.message);
    // Fallback to default rates
    rateCache.rates = { USD: 1, EUR: 1.1, GBP: 1.3, JPY: 110 };
    rateCache.timestamp = Date.now();
    return rateCache.rates;
  }
}

function convertToUSD(amount, currency) {
  if (currency === "USD") {
    return amount;
  }

  const rate = rateCache.rates?.[currency];
  if (!rate) {
    console.warn(`No exchange rate found for currency ${currency}. Using 1 as fallback.`);
    return amount; // Fallback: treat as USD
  }

  // Convert from currency to USD: amount * (1/rate) if rate is USD/currency
  // Or amount * rate if rate is currency/USD
  // Open Exchange Rates returns rates as USD/base_currency, so rate is USD/1_unit_of_currency
  // To convert amount in currency to USD: amount / rate
  return amount / rate;
}

module.exports = { fetchExchangeRates, convertToUSD }