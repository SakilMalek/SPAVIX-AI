import { Database } from '../db';

async function initializePlans() {
  try {
    console.log('🔄 Initializing subscription plans...\n');

    const plans = [
      {
        name: 'Starter',
        display_name: 'Starter',
        price: 0,
        billing_cycle: 'monthly',
        features: {
          transformations: true,
          standard_styles: true,
          basic_detection: true,
          community_support: true,
        },
        limits: {
          transformations_per_month: 8,
          storage_gb: 1,
          concurrent_generations: 1,
        },
      },
      {
        name: 'Pro',
        display_name: 'Pro',
        price: 1900,
        billing_cycle: 'monthly',
        features: {
          transformations: true,
          standard_styles: true,
          premium_styles: true,
          advanced_detection: true,
          high_resolution_exports: true,
          priority_generation: true,
          personalized_advice: true,
          community_support: true,
        },
        limits: {
          transformations_per_month: null,
          storage_gb: 50,
          concurrent_generations: 3,
        },
      },
      {
        name: 'Business',
        display_name: 'Business',
        price: 4900,
        billing_cycle: 'monthly',
        features: {
          transformations: true,
          standard_styles: true,
          premium_styles: true,
          advanced_detection: true,
          high_resolution_exports: true,
          priority_generation: true,
          personalized_advice: true,
          team_collaboration: true,
          api_access: true,
          custom_branding: true,
          whitelabel_reports: true,
          dedicated_support: true,
          community_support: true,
        },
        limits: {
          transformations_per_month: null,
          api_calls_per_month: 100000,
          storage_gb: 500,
          concurrent_generations: 10,
          team_members: null,
        },
      },
    ];

    for (const plan of plans) {
      const query = `
        INSERT INTO subscription_plans (name, display_name, price, billing_cycle, features, limits)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO UPDATE SET
          display_name = $2,
          price = $3,
          billing_cycle = $4,
          features = $5,
          limits = $6,
          updated_at = NOW()
      `;

      await Database.query(query, [
        plan.name,
        plan.display_name,
        plan.price,
        plan.billing_cycle,
        JSON.stringify(plan.features),
        JSON.stringify(plan.limits),
      ]);

      console.log(`✅ ${plan.name} plan initialized`);
    }

    console.log('\n✅ All subscription plans initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing plans:', error);
    process.exit(1);
  }
}

initializePlans();
