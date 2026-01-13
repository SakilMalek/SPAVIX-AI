/**
 * Country Detection Utility
 * Detects user's country and routes to appropriate payment gateway
 */

import { logger } from './logger.js';

export type PaymentGateway = 'stripe' | 'razorpay';

// Countries that should use Razorpay
const RAZORPAY_COUNTRIES = [
  'IN', // India
];

// Countries that should use Stripe
const STRIPE_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ', 'SG', 'HK', 'JP', 'KR',
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE',
  'NO', 'DK', 'FI', 'PL', 'CZ', 'PT', 'GR', 'IE', 'LU',
  'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC',
  'ZA', 'EG', 'NG', 'KE', 'GH',
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM',
  'IL', 'TR', 'PK', 'BD', 'LK', 'TH', 'MY', 'PH', 'ID', 'VN',
  'NZ', 'FJ',
];

export interface CountryInfo {
  code: string;
  name: string;
  gateway: PaymentGateway;
}

/**
 * Get country code from IP address using GeoIP lookup
 * Falls back to user profile if available
 */
export function getCountryFromIP(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  // This is a placeholder - in production, you'd use a GeoIP service
  // Examples: MaxMind GeoIP2, IP2Location, ipstack, etc.
  // For now, we'll return null and rely on user profile
  logger.debug('IP-based country detection would be implemented here', { ip });
  return null;
}

/**
 * Determine which payment gateway to use based on country code
 * Priority: Razorpay (if available), then Stripe
 */
export function getPaymentGateway(countryCode: string | null | undefined): PaymentGateway {
  if (!countryCode) {
    // Default to Razorpay for unknown countries (since Stripe not available in India)
    return 'razorpay';
  }

  const upperCode = countryCode.toUpperCase();

  // Always prefer Razorpay for India
  if (RAZORPAY_COUNTRIES.includes(upperCode)) {
    return 'razorpay';
  }

  // For international countries, check if Stripe is available
  if (STRIPE_COUNTRIES.includes(upperCode)) {
    // Check if Stripe keys are configured
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      return 'stripe';
    }
    // Fallback to Razorpay if Stripe not configured
    return 'razorpay';
  }

  // Default to Razorpay for countries not explicitly configured
  return 'razorpay';
}

/**
 * Get country info including payment gateway
 */
export function getCountryInfo(countryCode: string | null | undefined): CountryInfo {
  const gateway = getPaymentGateway(countryCode);

  return {
    code: countryCode?.toUpperCase() || 'UNKNOWN',
    name: getCountryName(countryCode),
    gateway,
  };
}

/**
 * Get country name from country code
 */
function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) {
    return 'Unknown';
  }

  const countryNames: Record<string, string> = {
    'IN': 'India',
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'JP': 'Japan',
    'KR': 'South Korea',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'PT': 'Portugal',
    'GR': 'Greece',
    'IE': 'Ireland',
    'LU': 'Luxembourg',
    'MX': 'Mexico',
    'BR': 'Brazil',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'VE': 'Venezuela',
    'EC': 'Ecuador',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'GH': 'Ghana',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'QA': 'Qatar',
    'KW': 'Kuwait',
    'BH': 'Bahrain',
    'OM': 'Oman',
    'IL': 'Israel',
    'TR': 'Turkey',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'LK': 'Sri Lanka',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'VN': 'Vietnam',
    'FJ': 'Fiji',
  };

  return countryNames[countryCode?.toUpperCase() || ''] || countryCode?.toUpperCase() || 'Unknown';
}

/**
 * Get pricing in local currency based on country
 */
export function getLocalPricing(countryCode: string | null | undefined): {
  starter: number;
  pro: number;
  business: number;
  currency: string;
  symbol: string;
} {
  const gateway = getPaymentGateway(countryCode);

  if (gateway === 'razorpay') {
    // Indian pricing in INR
    return {
      starter: 0,
      pro: 499,
      business: 1299,
      currency: 'INR',
      symbol: '₹',
    };
  }

  // International pricing in USD
  return {
    starter: 0,
    pro: 19,
    business: 49,
    currency: 'USD',
    symbol: '$',
  };
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, countryCode: string | null | undefined): string {
  const pricing = getLocalPricing(countryCode);
  return `${pricing.symbol}${amount}/${pricing.currency === 'INR' ? 'month' : 'month'}`;
}

/**
 * Check if country supports a specific gateway
 */
export function supportsGateway(countryCode: string | null | undefined, gateway: PaymentGateway): boolean {
  const detectedGateway = getPaymentGateway(countryCode);
  return detectedGateway === gateway;
}
