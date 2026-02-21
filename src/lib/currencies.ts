export interface Currency {
  code: string
  symbol: string
  name: string
  locale: string
  decimals: number
  position: 'before' | 'after'
}

export const CURRENCIES: Currency[] = [
  // Americas
  { code: 'ARS', symbol: '$', name: 'Peso Argentino', locale: 'es-AR', decimals: 0, position: 'before' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2, position: 'before' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', locale: 'pt-BR', decimals: 2, position: 'before' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno', locale: 'es-CL', decimals: 0, position: 'before' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano', locale: 'es-CO', decimals: 0, position: 'before' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano', locale: 'es-MX', decimals: 2, position: 'before' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', locale: 'es-PE', decimals: 2, position: 'before' },
  { code: 'UYU', symbol: '$U', name: 'Peso Uruguayo', locale: 'es-UY', decimals: 2, position: 'before' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní Paraguayo', locale: 'es-PY', decimals: 0, position: 'before' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano', locale: 'es-BO', decimals: 2, position: 'before' },
  { code: 'VES', symbol: 'Bs.D', name: 'Bolívar Venezolano', locale: 'es-VE', decimals: 2, position: 'before' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2, position: 'before' },
  { code: 'CRC', symbol: '₡', name: 'Colón Costarricense', locale: 'es-CR', decimals: 0, position: 'before' },
  { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', locale: 'es-DO', decimals: 2, position: 'before' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal Guatemalteco', locale: 'es-GT', decimals: 2, position: 'before' },
  { code: 'HNL', symbol: 'L', name: 'Lempira Hondureña', locale: 'es-HN', decimals: 2, position: 'before' },
  { code: 'NIO', symbol: 'C$', name: 'Córdoba Nicaragüense', locale: 'es-NI', decimals: 2, position: 'before' },
  { code: 'PAB', symbol: 'B/.', name: 'Balboa Panameño', locale: 'es-PA', decimals: 2, position: 'before' },

  // Europe
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2, position: 'after' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2, position: 'before' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco Suizo', locale: 'de-CH', decimals: 2, position: 'before' },
  { code: 'SEK', symbol: 'kr', name: 'Corona Sueca', locale: 'sv-SE', decimals: 2, position: 'after' },
  { code: 'NOK', symbol: 'kr', name: 'Corona Noruega', locale: 'nb-NO', decimals: 2, position: 'after' },
  { code: 'DKK', symbol: 'kr', name: 'Corona Danesa', locale: 'da-DK', decimals: 2, position: 'after' },
  { code: 'PLN', symbol: 'zł', name: 'Zloty Polaco', locale: 'pl-PL', decimals: 2, position: 'after' },
  { code: 'CZK', symbol: 'Kč', name: 'Corona Checa', locale: 'cs-CZ', decimals: 2, position: 'after' },
  { code: 'HUF', symbol: 'Ft', name: 'Forinto Húngaro', locale: 'hu-HU', decimals: 0, position: 'after' },
  { code: 'RON', symbol: 'lei', name: 'Leu Rumano', locale: 'ro-RO', decimals: 2, position: 'after' },
  { code: 'BGN', symbol: 'лв', name: 'Lev Búlgaro', locale: 'bg-BG', decimals: 2, position: 'after' },
  { code: 'HRK', symbol: 'kn', name: 'Kuna Croata', locale: 'hr-HR', decimals: 2, position: 'after' },
  { code: 'RSD', symbol: 'din', name: 'Dinar Serbio', locale: 'sr-RS', decimals: 0, position: 'after' },
  { code: 'UAH', symbol: '₴', name: 'Grivna Ucraniana', locale: 'uk-UA', decimals: 2, position: 'after' },
  { code: 'RUB', symbol: '₽', name: 'Rublo Ruso', locale: 'ru-RU', decimals: 2, position: 'after' },
  { code: 'TRY', symbol: '₺', name: 'Lira Turca', locale: 'tr-TR', decimals: 2, position: 'before' },
  { code: 'ISK', symbol: 'kr', name: 'Corona Islandesa', locale: 'is-IS', decimals: 0, position: 'after' },

  // Asia & Oceania
  { code: 'JPY', symbol: '¥', name: 'Yen Japonés', locale: 'ja-JP', decimals: 0, position: 'before' },
  { code: 'CNY', symbol: '¥', name: 'Yuan Chino', locale: 'zh-CN', decimals: 2, position: 'before' },
  { code: 'KRW', symbol: '₩', name: 'Won Surcoreano', locale: 'ko-KR', decimals: 0, position: 'before' },
  { code: 'INR', symbol: '₹', name: 'Rupia India', locale: 'en-IN', decimals: 2, position: 'before' },
  { code: 'IDR', symbol: 'Rp', name: 'Rupia Indonesia', locale: 'id-ID', decimals: 0, position: 'before' },
  { code: 'PHP', symbol: '₱', name: 'Peso Filipino', locale: 'en-PH', decimals: 2, position: 'before' },
  { code: 'THB', symbol: '฿', name: 'Baht Tailandés', locale: 'th-TH', decimals: 2, position: 'before' },
  { code: 'VND', symbol: '₫', name: 'Dong Vietnamita', locale: 'vi-VN', decimals: 0, position: 'after' },
  { code: 'MYR', symbol: 'RM', name: 'Ringgit Malasio', locale: 'ms-MY', decimals: 2, position: 'before' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2, position: 'before' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'en-HK', decimals: 2, position: 'before' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', locale: 'zh-TW', decimals: 0, position: 'before' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2, position: 'before' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ', decimals: 2, position: 'before' },
  { code: 'PKR', symbol: '₨', name: 'Rupia Pakistaní', locale: 'en-PK', decimals: 0, position: 'before' },
  { code: 'BDT', symbol: '৳', name: 'Taka Bangladesí', locale: 'bn-BD', decimals: 2, position: 'before' },
  { code: 'LKR', symbol: 'Rs', name: 'Rupia de Sri Lanka', locale: 'si-LK', decimals: 2, position: 'before' },
  { code: 'NPR', symbol: 'रू', name: 'Rupia Nepalí', locale: 'ne-NP', decimals: 2, position: 'before' },
  { code: 'MMK', symbol: 'K', name: 'Kyat de Myanmar', locale: 'my-MM', decimals: 0, position: 'before' },
  { code: 'KHR', symbol: '៛', name: 'Riel Camboyano', locale: 'km-KH', decimals: 0, position: 'before' },

  // Middle East & Africa
  { code: 'AED', symbol: 'د.إ', name: 'Dirham EAU', locale: 'ar-AE', decimals: 2, position: 'before' },
  { code: 'SAR', symbol: '﷼', name: 'Riyal Saudí', locale: 'ar-SA', decimals: 2, position: 'before' },
  { code: 'QAR', symbol: '﷼', name: 'Riyal Catarí', locale: 'ar-QA', decimals: 2, position: 'before' },
  { code: 'KWD', symbol: 'د.ك', name: 'Dinar Kuwaití', locale: 'ar-KW', decimals: 3, position: 'before' },
  { code: 'BHD', symbol: 'BD', name: 'Dinar Bareiní', locale: 'ar-BH', decimals: 3, position: 'before' },
  { code: 'OMR', symbol: '﷼', name: 'Rial Omaní', locale: 'ar-OM', decimals: 3, position: 'before' },
  { code: 'ILS', symbol: '₪', name: 'Shekel Israelí', locale: 'he-IL', decimals: 2, position: 'before' },
  { code: 'EGP', symbol: 'E£', name: 'Libra Egipcia', locale: 'ar-EG', decimals: 2, position: 'before' },
  { code: 'ZAR', symbol: 'R', name: 'Rand Sudafricano', locale: 'en-ZA', decimals: 2, position: 'before' },
  { code: 'NGN', symbol: '₦', name: 'Naira Nigeriana', locale: 'en-NG', decimals: 2, position: 'before' },
  { code: 'KES', symbol: 'KSh', name: 'Chelín Keniano', locale: 'en-KE', decimals: 2, position: 'before' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedi Ghanés', locale: 'en-GH', decimals: 2, position: 'before' },
  { code: 'MAD', symbol: 'د.م.', name: 'Dírham Marroquí', locale: 'ar-MA', decimals: 2, position: 'after' },
  { code: 'TND', symbol: 'د.ت', name: 'Dinar Tunecino', locale: 'ar-TN', decimals: 3, position: 'after' },
  { code: 'TZS', symbol: 'TSh', name: 'Chelín Tanzano', locale: 'sw-TZ', decimals: 0, position: 'before' },
  { code: 'UGX', symbol: 'USh', name: 'Chelín Ugandés', locale: 'en-UG', decimals: 0, position: 'before' },
  { code: 'XOF', symbol: 'CFA', name: 'Franco CFA Oeste', locale: 'fr-SN', decimals: 0, position: 'after' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franco CFA Centro', locale: 'fr-CM', decimals: 0, position: 'after' },
]

export const getCurrency = (code: string): Currency =>
  CURRENCIES.find(c => c.code === code) || CURRENCIES[0]

export const formatMoney = (amount: number, currencyCode: string = 'ARS'): string => {
  const cur = getCurrency(currencyCode)
  try {
    return new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      maximumFractionDigits: cur.decimals,
      minimumFractionDigits: cur.decimals,
    }).format(amount)
  } catch {
    // Fallback manual
    const num = cur.decimals === 0
      ? Math.round(amount).toLocaleString()
      : amount.toFixed(cur.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return cur.position === 'before' ? `${cur.symbol} ${num}` : `${num} ${cur.symbol}`
  }
}

// Grouped for the dropdown
export const CURRENCY_GROUPS = [
  { label: '🌎 América', currencies: ['ARS','USD','BRL','CLP','COP','MXN','PEN','UYU','PYG','BOB','VES','CAD','CRC','DOP','GTQ','HNL','NIO','PAB'] },
  { label: '🇪🇺 Europa', currencies: ['EUR','GBP','CHF','SEK','NOK','DKK','PLN','CZK','HUF','RON','BGN','HRK','RSD','UAH','RUB','TRY','ISK'] },
  { label: '🌏 Asia y Oceanía', currencies: ['JPY','CNY','KRW','INR','IDR','PHP','THB','VND','MYR','SGD','HKD','TWD','AUD','NZD','PKR','BDT','LKR','NPR','MMK','KHR'] },
  { label: '🌍 Medio Oriente y África', currencies: ['AED','SAR','QAR','KWD','BHD','OMR','ILS','EGP','ZAR','NGN','KES','GHS','MAD','TND','TZS','UGX','XOF','XAF'] },
] as const
