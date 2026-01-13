import { Database } from './server/db';

async function debugProfilePicture() {
  try {
    console.log('🔍 Debugging profile picture upload\n');
    console.log('═'.repeat(70));

    const userId = '596af833-df6e-4cd5-a7aa-73ce11356b88'; // user1@gmail.com

    // Check current user picture
    const userResult = await Database.query(
      'SELECT id, email, picture FROM users WHERE id = $1',
      [userId]
    );

    if ((userResult.rows as any[]).length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const user = (userResult.rows as any[])[0];
    console.log('\n👤 USER:\n');
    console.log(`Email: ${user.email}`);
    console.log(`Picture stored: ${user.picture ? 'YES' : 'NO'}`);
    if (user.picture) {
      console.log(`Picture length: ${user.picture.length} characters`);
      console.log(`Picture preview: ${user.picture.substring(0, 100)}...`);
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ DEBUG COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugProfilePicture();
