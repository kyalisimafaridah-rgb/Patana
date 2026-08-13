import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARS[randomInt(CHARS.length)];
  }
  return out;
}

/** Generate a unique reference number e.g. PAT-A1B2C3 */
export function generateReferenceNumber(prefix = 'PAT'): string {
  return `${prefix}-${randomCode(6)}`;
}

/** Generate a one-time activation key (cryptographically strong) */
export function generateActivationKey(): string {
  return randomCode(12);
}

/** 6-digit numeric OTP */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Generate a unique value with collision retry against a checker.
 * checker returns true if the value already exists.
 */
export async function generateUnique(
  factory: () => string,
  exists: (value: string) => Promise<boolean>,
  maxAttempts = 8
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const value = factory();
    if (!(await exists(value))) return value;
  }
  // Extremely unlikely fallback — stay within charset
  return factory() + randomCode(4);
}
