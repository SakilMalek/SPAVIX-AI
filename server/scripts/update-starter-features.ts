/**
 * Update Starter Plan Features
 * Adds missing feature flags to the starter plan
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateStarterFeatures() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Updating Starter plan features...');

    const features = {
      transformations: true,
      standard_styles: true,
      basic_product_detection: true,
      community_support: true,
      unlimited_transformations: false,
      premium_styles: false,
      high_resolution_exports: false,
      priority_generation: false,
      ai_design_advice: false,
      team_collaboration: false,
      api_access: false,
      custom_brand_styles: false,
      whitelabel_reports: false,
      dedicated_support: false,
      advanced_product_matching: false,
      bulk_processing: false
    };

    const result = await pool.query(
      `UPDATE subscription_plans 
       SET features = $1, updated_at = NOW()
       WHERE name = 'starter'
       RETURNING *`,
      [JSON.stringify(features)]
    );

    if (result.rows.length > 0) {
      console.log('✅ Starter plan features updated successfully!');
      console.log('📋 Updated features:', features);
    } else {
      console.log('❌ Starter plan not found');
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateStarterFeatures().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
