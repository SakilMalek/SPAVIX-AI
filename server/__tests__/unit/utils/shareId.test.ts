import { generateSecureShareId } from '../../../utils/shareId';

describe('Share ID Generation', () => {
  it('should generate a secure share ID', () => {
    const shareId = generateSecureShareId();
    expect(shareId).toBeDefined();
    expect(typeof shareId).toBe('string');
    expect(shareId.length).toBeGreaterThan(0);
  });

  it('should generate unique share IDs', () => {
    const id1 = generateSecureShareId();
    const id2 = generateSecureShareId();
    expect(id1).not.toBe(id2);
  });

  it('should generate cryptographically secure IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureShareId());
    }
    expect(ids.size).toBe(100); // All unique
  });

  it('should generate URL-safe IDs', () => {
    const shareId = generateSecureShareId();
    // Should only contain alphanumeric characters
    expect(/^[a-zA-Z0-9]+$/.test(shareId)).toBe(true);
  });
});
