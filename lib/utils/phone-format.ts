/**
 * Format phone number to (XXX) XXX-XXXX format
 * Only allows 10 digits
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digitsOnly.slice(0, 10);
  
  // Format as (XXX) XXX-XXXX
  if (limitedDigits.length === 0) {
    return '';
  } else if (limitedDigits.length <= 3) {
    return `(${limitedDigits}`;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6, 10)}`;
  }
}

/**
 * Extract digits only from formatted phone number
 */
export function getPhoneDigits(formattedPhone: string): string {
  return formattedPhone.replace(/\D/g, '');
}

