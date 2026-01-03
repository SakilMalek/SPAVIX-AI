/**
 * Test script to diagnose transformation loading performance
 * Run with: node test-transformation-load.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testTransformationLoad() {
  console.log('\n=== TRANSFORMATION LOAD PERFORMANCE TEST ===\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test 1: Direct database query with images
    console.log('TEST 1: Full Query (with images)');
    console.log('--------------------------------');
    
    const userId = '40f961e0-dc53-41b2-b8d1-27e6479e24d2';
    const limit = 50;
    const offset = 0;

    const queryStart = Date.now();
    console.log(`[${new Date().toISOString()}] Starting full query...`);
    
    const result = await pool.query(
      'SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    const queryDuration = Date.now() - queryStart;
    console.log(`[${new Date().toISOString()}] Query completed in ${queryDuration}ms`);
    console.log(`Retrieved ${result.rows.length} generations`);
    
    if (result.rows.length > 0) {
      console.log('\nFirst generation:');
      const gen = result.rows[0];
      console.log(`  - ID: ${gen.id}`);
      console.log(`  - Style: ${gen.style}`);
      console.log(`  - Room Type: ${gen.room_type}`);
      console.log(`  - Before Image Size: ${gen.before_image_url?.length || 0} bytes`);
      console.log(`  - After Image Size: ${gen.after_image_url?.length || 0} bytes`);
    }

    // Test 2: Query without images
    console.log('\n\nTEST 2: Metadata-Only Query (no images)');
    console.log('---------------------------------------');
    
    const metadataStart = Date.now();
    console.log(`[${new Date().toISOString()}] Starting metadata query...`);
    
    const metadataResult = await pool.query(
      'SELECT id, style, room_type, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    const metadataDuration = Date.now() - metadataStart;
    console.log(`[${new Date().toISOString()}] Query completed in ${metadataDuration}ms`);
    console.log(`Retrieved ${metadataResult.rows.length} items`);

    // Test 3: Data size analysis
    console.log('\n\nTEST 3: Data Size Analysis');
    console.log('---------------------------');
    
    let totalImageSize = 0;
    result.rows.forEach(gen => {
      const beforeSize = gen.before_image_url?.length || 0;
      const afterSize = gen.after_image_url?.length || 0;
      totalImageSize += beforeSize + afterSize;
    });
    
    console.log(`Total Image Data: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Average per generation: ${(totalImageSize / result.rows.length / 1024).toFixed(2)} KB`);

    // Test 4: Multiple sequential queries
    console.log('\n\nTEST 4: Multiple Sequential Queries');
    console.log('------------------------------------');
    
    const times = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await pool.query(
        'SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      const duration = Date.now() - start;
      times.push(duration);
      console.log(`Query ${i + 1}: ${duration}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average Query Time: ${avgTime.toFixed(2)}ms`);

    // Summary
    console.log('\n\n=== SUMMARY ===\n');
    console.log(`Full query (with images): ${queryDuration}ms`);
    console.log(`Metadata-only query: ${metadataDuration}ms`);
    console.log(`Image data size: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Query time difference: ${queryDuration - metadataDuration}ms`);
    
    if (queryDuration > metadataDuration * 5) {
      console.log('\n⚠️  BOTTLENECK: IMAGE DATA TRANSFER');
      console.log('   The query is slow because of large base64 images');
      console.log('   Solution: Load images on-demand, not with metadata');
    } else if (queryDuration > 1000) {
      console.log('\n⚠️  BOTTLENECK: DATABASE QUERY EXECUTION');
      console.log('   The query itself is slow');
      console.log('   Solution: Add database indexes or optimize query');
    } else {
      console.log('\n✅ Queries are fast. Issue is likely on the frontend.');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    await pool.end();
    process.exit(1);
  }
}

testTransformationLoad();
