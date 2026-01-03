import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure share ID
 * Uses 16 random bytes encoded as hex (32 characters)
 * Much more secure than Math.random().toString(36)
 */
export function generateSecureShareId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Validate share ID format
 * Ensures it's a valid 32-character hex string
 */
export function isValidShareId(shareId: unknown): boolean {
  if (typeof shareId !== 'string') {
    return false;
  }

  // Must be exactly 32 hex characters
  return /^[a-f0-9]{32}$/.test(shareId);
}
