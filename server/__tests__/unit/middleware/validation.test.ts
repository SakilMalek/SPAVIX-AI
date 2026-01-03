import { validateRequest, signupSchema, loginSchema, paginationSchema } from '../../../middleware/validation';
import { AppError } from '../../../middleware/errorHandler';

describe('Validation Middleware', () => {
  describe('validateRequest', () => {
    it('should validate correct signup data', () => {
      const data = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        profilePicture: 'https://example.com/pic.jpg',
      };

      const result = validateRequest(signupSchema, data);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('SecurePass123!');
    });

    it('should throw AppError for invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'SecurePass123!',
      };

      expect(() => validateRequest(signupSchema, data)).toThrow(AppError);
    });

    it('should throw AppError for weak password', () => {
      const data = {
        email: 'test@example.com',
        password: 'weak',
      };

      expect(() => validateRequest(signupSchema, data)).toThrow(AppError);
    });

    it('should enforce password complexity requirements', () => {
      const testCases = [
        { password: 'NoNumber!', shouldFail: true }, // No number
        { password: 'noupppercase123!', shouldFail: true }, // No uppercase
        { password: 'NOLOWERCASE123!', shouldFail: true }, // No lowercase
        { password: 'NoSpecial123', shouldFail: true }, // No special char
        { password: 'ValidPass123!', shouldFail: false }, // Valid
      ];

      testCases.forEach(({ password, shouldFail }) => {
        const data = {
          email: 'test@example.com',
          password,
        };

        if (shouldFail) {
          expect(() => validateRequest(signupSchema, data)).toThrow();
        } else {
          expect(() => validateRequest(signupSchema, data)).not.toThrow();
        }
      });
    });

    it('should validate login schema', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validateRequest(loginSchema, data);
      expect(result.email).toBe('test@example.com');
    });

    it('should enforce pagination limits', () => {
      const validData = {
        limit: 50,
        offset: 0,
      };

      const result = validateRequest(paginationSchema, validData);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should enforce max pagination limit of 100', () => {
      const invalidData = {
        limit: 999999,
        offset: 0,
      };

      expect(() => validateRequest(paginationSchema, invalidData)).toThrow();
    });

    it('should use default pagination values', () => {
      const result = validateRequest(paginationSchema, {});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });
});
