/**
 * Test script to diagnose transformation loading performance
 * Run with: npx ts-node test-transformation-load.ts
 */

import { Database, getPool } from './server/db';

async function testTransformationLoad() {
  console.log('\n=== TRANSFORMATION LOAD PERFORMANCE TEST ===\n');

  try {
    // Test 1: Direct database query
    console.log('TEST 1: Direct Database Query');
    console.log('------------------------------');
    
    const userId = '40f961e0-dc53-41b2-b8d1-27e6479e24d2'; // Your user ID from logs
    const limit = 50;
    const offset = 0;

    const queryStart = Date.now();
    console.log(`[${new Date().toISOString()}] Starting database query...`);
    
    const generations = await Database.getGenerations(userId, limit, offset);
    
    const queryDuration = Date.now() - queryStart;
    console.log(`[${new Date().toISOString()}] Query completed in ${queryDuration}ms`);
    console.log(`Retrieved ${generations.length} generations`);
    
    if (generations.length > 0) {
      console.log('\nFirst generation:');
      const gen = generations[0] as any;
      console.log(`  - ID: ${gen.id}`);
      console.log(`  - Style: ${gen.style}`);
      console.log(`  - Room Type: ${gen.room_type}`);
      console.log(`  - Before Image Size: ${gen.before_image_url?.length || 0} bytes`);
      console.log(`  - After Image Size: ${gen.after_image_url?.length || 0} bytes`);
    }

    // Test 2: Check database connection pool
    console.log('\n\nTEST 2: Database Connection Pool Status');
    console.log('----------------------------------------');
    
    const pool = getPool();
    console.log(`Total Connections: ${pool.totalCount}`);
    console.log(`Idle Connections: ${pool.idleCount}`);
    console.log(`Waiting Connections: ${pool.waitingCount}`);

    // Test 3: Multiple sequential queries
    console.log('\n\nTEST 3: Multiple Sequential Queries');
    console.log('------------------------------------');
    
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await Database.getGenerations(userId, limit, offset);
      const duration = Date.now() - start;
      times.push(duration);
      console.log(`Query ${i + 1}: ${duration}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average Query Time: ${avgTime.toFixed(2)}ms`);

    // Test 4: Check data size
    console.log('\n\nTEST 4: Data Size Analysis');
    console.log('---------------------------');
    
    let totalImageSize = 0;
    let totalMetadataSize = 0;
    
    generations.forEach((gen: any) => {
      const beforeSize = gen.before_image_url?.length || 0;
      const afterSize = gen.after_image_url?.length || 0;
      totalImageSize += beforeSize + afterSize;
      
      // Rough estimate of metadata
      totalMetadataSize += JSON.stringify({
        id: gen.id,
        style: gen.style,
        room_type: gen.room_type,
        created_at: gen.created_at,
      }).length;
    });
    
    console.log(`Total Image Data: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Metadata: ${(totalMetadataSize / 1024).toFixed(2)} KB`);
    console.log(`Average per generation: ${(totalImageSize / generations.length / 1024).toFixed(2)} KB`);

    // Test 5: Query without images
    console.log('\n\nTEST 5: Query Performance Without Images');
    console.log('----------------------------------------');
    
    const metadataStart = Date.now();
    const result = await getPool().query(
      'SELECT id, style, room_type, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    const metadataDuration = Date.now() - metadataStart;
    
    console.log(`Metadata-only query: ${metadataDuration}ms`);
    console.log(`Retrieved ${result.rows.length} items`);

    console.log('\n=== TEST COMPLETE ===\n');
    console.log('SUMMARY:');
    console.log(`- Full query (with images): ${queryDuration}ms`);
    console.log(`- Metadata-only query: ${metadataDuration}ms`);
    console.log(`- Image data size: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Bottleneck: ${queryDuration > metadataDuration * 5 ? 'IMAGE DATA TRANSFER' : 'QUERY EXECUTION'}`);

    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

testTransformationLoad();
