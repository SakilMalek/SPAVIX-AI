import { Database } from './server/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function createTestUser() {
  try {
    console.log('🔍 Creating test user...\n');

    const testEmail = 'test@example.com';
    const testPassword = 'TestPassword123!';
    
    // Check if user already exists
    const existing = await Database.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );

    if ((existing.rows as any[]).length > 0) {
      console.log(`✅ User ${testEmail} already exists`);
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🔒 Password: ${testPassword}`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create user
    const result = await Database.query(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, email`,
      [randomUUID(), testEmail, passwordHash]
    );

    const user = (result.rows as any[])[0];
    console.log('✅ Test user created successfully!\n');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔒 Password: ${testPassword}`);
    console.log('\n💡 Use these credentials to login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();
