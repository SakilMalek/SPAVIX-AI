// Test setup and configuration
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long-1234567890';
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-characters-long-1234567890';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/spavix_test';
