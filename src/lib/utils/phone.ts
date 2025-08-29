export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const countries: Country[] = [
  { name: "Select Country", code: "", dialCode: "", flag: "" },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
  { name: "North Korea", code: "KP", dialCode: "+850", flag: "🇰🇵" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998", flag: "🇺🇿" },
];


/**
 * Format phone number for display (e.g., (555) 123-4567)
 */
export function formatPhoneDisplay(phone: string, countryCode: string = "US"): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format based on country
  if (countryCode === "US" || countryCode === "CA") {
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
  }

  // Default formatting for other countries
  return cleaned;
}

/**
 * Convert to E.164 format (+1234567890)
 */
export function formatE164(phone: string, dialCode: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (!cleaned) return '';

  // If the phone already starts with the dial code digits, don't duplicate
  const dialCodeDigits = dialCode.replace(/\D/g, '');

  if (cleaned.startsWith(dialCodeDigits)) {
    return `+${cleaned}`;
  }

  return `${dialCode}${cleaned}`;
}

/**
 * Parse E.164 format to get country and local number
 */
export function parseE164(e164Phone: string): { country: Country | null; localNumber: string } {
  if (!e164Phone.startsWith('+')) {
    return { country: null, localNumber: e164Phone };
  }

  const phoneNumber = e164Phone.slice(1); // Remove +

  // Find matching country by dial code
  for (const country of countries) {
    const dialCodeDigits = country.dialCode.replace(/\D/g, '');
    if (phoneNumber.startsWith(dialCodeDigits)) {
      return {
        country,
        localNumber: phoneNumber.slice(dialCodeDigits.length)
      };
    }
  }

  return { country: null, localNumber: phoneNumber };
}

/**
 * Validate phone number length based on country
 */
export function isValidPhoneLength(phone: string, countryCode: string): boolean {
  const cleaned = phone.replace(/\D/g, '');

  // Basic validation rules for common countries
  const validationRules: { [key: string]: number[] } = {
    US: [10], // US/Canada: 10 digits
    CA: [10],
    GB: [10, 11], // UK: 10-11 digits
    AU: [9, 10], // Australia: 9-10 digits
    DE: [10, 11, 12], // Germany: 10-12 digits
    FR: [9, 10], // France: 9-10 digits
    AE: [9], // UAE: 9 digits
    UZ: [9], // Uzbekistan: 9 digits
    // Add more as needed
  };

  const allowedLengths = validationRules[countryCode] || [7, 8, 9, 10, 11, 12]; // Default range
  return allowedLengths.includes(cleaned.length);
}

/**
 * Get country by dial code
 */
export function getCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find(country => country.dialCode === dialCode);
}

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return countries.find(country => country.code === code);
}

/**
 * Format phone number as user types
 */
export function formatPhoneAsTyping(value: string, countryCode: string = "US"): string {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');

  // Format for US/Canada
  if (countryCode === "US" || countryCode === "CA") {
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  }

  // For other countries, return cleaned digits
  return cleaned;
}