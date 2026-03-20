/**
 * Currency utilities for Morsel Customer App
 *
 * Default: MUR (Mauritian Rupee)
 * Format:  {symbol} {amount.toFixed(2)}  e.g. "₨ 250.00"
 */

export interface CurrencyDef {
  value: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { value: 'MUR', symbol: 'Rs',   name: 'Mauritian Rupee' },
  { value: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { value: 'USD', symbol: '$',    name: 'US Dollar' },
  { value: 'EUR', symbol: '€',    name: 'Euro' },
  { value: 'GBP', symbol: '£',    name: 'British Pound' },
  { value: 'AED', symbol: 'د.إ',  name: 'UAE Dirham' },
  { value: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { value: 'SAR', symbol: '﷼',    name: 'Saudi Riyal' },
  { value: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { value: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit' },
  { value: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { value: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling' },
  { value: 'NPR', symbol: 'Rs',   name: 'Nepalese Rupee' },
  { value: 'LKR', symbol: 'Rs',   name: 'Sri Lankan Rupee' },
  { value: 'PKR', symbol: 'Rs',   name: 'Pakistani Rupee' },
  { value: 'BDT', symbol: '৳',    name: 'Bangladeshi Taka' },
  { value: 'CAD', symbol: 'C$',   name: 'Canadian Dollar' },
  { value: 'CHF', symbol: 'Fr',   name: 'Swiss Franc' },
  { value: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { value: 'CNY', symbol: '¥',    name: 'Chinese Yuan' },
  { value: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { value: 'THB', symbol: '฿',    name: 'Thai Baht' },
  { value: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah' },
  { value: 'PHP', symbol: '₱',    name: 'Philippine Peso' },
  { value: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { value: 'QAR', symbol: 'QR',   name: 'Qatari Riyal' },
  { value: 'KWD', symbol: 'KD',   name: 'Kuwaiti Dinar' },
  { value: 'OMR', symbol: 'RO',   name: 'Omani Rial' },
  { value: 'BHD', symbol: 'BD',   name: 'Bahraini Dinar' },
  { value: 'NGN', symbol: '₦',    name: 'Nigerian Naira' },
  { value: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi' },
  { value: 'TZS', symbol: 'TSh',  name: 'Tanzanian Shilling' },
  { value: 'UGX', symbol: 'USh',  name: 'Ugandan Shilling' },
  { value: 'ETB', symbol: 'Br',   name: 'Ethiopian Birr' },
  { value: 'EGP', symbol: 'E£',   name: 'Egyptian Pound' },
  { value: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  { value: 'TND', symbol: 'DT',   name: 'Tunisian Dinar' },
  { value: 'SCR', symbol: 'SR',   name: 'Seychellois Rupee' },
  { value: 'MVR', symbol: 'Rf',   name: 'Maldivian Rufiyaa' },
  { value: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { value: 'MXN', symbol: 'MX$',  name: 'Mexican Peso' },
  { value: 'COP', symbol: 'COP$', name: 'Colombian Peso' },
  { value: 'ARS', symbol: 'AR$',  name: 'Argentine Peso' },
];

const symbolMap = new Map<string, string>(
  CURRENCIES.map((c) => [c.value, c.symbol])
);

export const DEFAULT_CURRENCY = 'MUR';
export const DEFAULT_TIMEZONE = 'Indian/Mauritius';

/**
 * Returns the display symbol for a given ISO 4217 currency code.
 * Falls back to the DEFAULT_CURRENCY symbol if code is unknown.
 */
export function getCurrencySymbol(code?: string): string {
  if (!code) return symbolMap.get(DEFAULT_CURRENCY)!;
  return symbolMap.get(code) ?? symbolMap.get(DEFAULT_CURRENCY)!;
}

/**
 * Formats an amount as a price string: "{symbol} {amount.toFixed(2)}"
 * e.g. formatPrice(250, 'MUR') → "₨ 250.00"
 */
export function formatPrice(amount: number, currencyCode?: string): string {
  return `${getCurrencySymbol(currencyCode)} ${amount.toFixed(2)}`;
}
