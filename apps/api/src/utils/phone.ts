/** Normalize phone/WhatsApp to digits only for comparison */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Soft match: compare last 9–12 digits so +2567... and 07... can match */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
  // Compare last 9 digits (common for UG local vs international)
  if (na.length >= 9 && nb.length >= 9) {
    return na.slice(-9) === nb.slice(-9);
  }
  return false;
}
