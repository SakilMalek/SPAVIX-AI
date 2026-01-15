-- Migration: Add Starter Plan Features
-- Created: 2026-01-14
-- Description: Adds tables for email campaigns, tutorials, download history, and analytics

-- ============================================
-- 1. EMAIL CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'inspiration', 'tips', 'newsletter'
  frequency VARCHAR(50) NOT NULL, -- 'weekly', 'daily', 'monthly'
  min_plan_tier INTEGER DEFAULT 1, -- 1=starter, 2=pro, 3=business
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. USER EMAIL PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekly_inspiration BOOLEAN DEFAULT true,
  design_tips BOOLEAN DEFAULT true,
  newsletter BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 3. TUTORIALS/CONTENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100), -- 'design', 'tips', 'features', 'getting-started'
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  min_plan_tier INTEGER DEFAULT 1, -- 1=starter, 2=pro, 3=business
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. DOWNLOAD HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_id UUID,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50), -- 'png', 'jpg', 'pdf', etc.
  download_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'transformation', 'export', 'project_created', 'style_used', etc.
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_frequency ON email_campaigns(frequency);

CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON user_email_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category);
CREATE INDEX IF NOT EXISTS idx_tutorials_difficulty ON tutorials(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_tutorials_plan_tier ON tutorials(min_plan_tier);

CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_date ON download_history(download_date);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- ============================================
-- SEED INITIAL TUTORIALS FOR STARTER PLAN
-- ============================================

INSERT INTO tutorials (title, description, content, category, difficulty_level, min_plan_tier, order_index)
VALUES 
  (
    'Getting Started with SPAVIX',
    'Learn the basics of using SPAVIX for your first design transformation',
    'Welcome to SPAVIX! This tutorial will guide you through uploading an image and creating your first design transformation. Start by clicking the "New Transformation" button and selecting an image from your device.',
    'getting-started',
    'beginner',
    1,
    1
  ),
  (
    'Understanding Design Styles',
    'Explore the different design styles available in your plan',
    'SPAVIX offers multiple design styles to transform your spaces. In the Starter plan, you have access to Basic, Modern, and Minimalist styles. Each style applies different design principles and aesthetics to your room designs.',
    'design',
    'beginner',
    1,
    2
  ),
  (
    'Using Materials & Colors',
    'Learn how to customize materials and colors in your transformations',
    'Customize your design transformations by selecting specific materials, wall colors, floor types, and lighting moods. These options help you create designs that match your preferences and existing decor.',
    'features',
    'beginner',
    1,
    3
  ),
  (
    'Saving & Organizing Projects',
    'Keep your designs organized with the Projects feature',
    'Create projects to organize your design transformations. In the Starter plan, you can create up to 3 projects. Each project can contain multiple transformations, making it easy to organize designs by room or theme.',
    'features',
    'beginner',
    1,
    4
  ),
  (
    'Exporting Your Designs',
    'Download and share your transformed designs',
    'Export your designs in standard resolution (1024x1024) perfect for sharing on social media or with clients. Click the export button on any transformation to download your design as a high-quality image.',
    'features',
    'beginner',
    1,
    5
  ),
  (
    'Design Tips for Better Results',
    'Pro tips for getting the best design transformations',
    'For best results: 1) Use clear, well-lit photos of your space, 2) Provide accurate room dimensions, 3) Select materials that match your existing decor, 4) Experiment with different styles to find your preference.',
    'tips',
    'beginner',
    1,
    6
  );

-- ============================================
-- SEED INITIAL EMAIL CAMPAIGNS
-- ============================================

INSERT INTO email_campaigns (name, subject, content, type, frequency, min_plan_tier)
VALUES
  (
    'Weekly Design Inspiration',
    'Your Weekly Design Inspiration - Week {{week_number}}',
    'Check out this week''s trending design styles and get inspired by our community gallery. Discover new ways to transform your spaces!',
    'inspiration',
    'weekly',
    1
  ),
  (
    'Design Tips Newsletter',
    'Design Tips: {{tip_title}}',
    'Learn a new design tip this week. {{tip_content}} Try applying this tip to your next transformation!',
    'tips',
    'weekly',
    1
  );

-- ============================================
-- TRIGGER: Create email preferences for new users
-- ============================================

CREATE OR REPLACE FUNCTION create_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_email_preferences (user_id, weekly_inspiration, design_tips, newsletter)
  VALUES (NEW.id, true, true, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_email_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_email_preferences();

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_email_preferences_updated_at BEFORE UPDATE ON user_email_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorials_updated_at BEFORE UPDATE ON tutorials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENT: Feature Restrictions
-- ============================================
-- The following features are restricted to specific plans via feature flags in subscription_plans table:
-- - premium_styles: false for Starter (Pro+)
-- - high_resolution_exports: false for Starter (Pro+)
-- - priority_generation: false for Starter (Pro+)
-- - advanced_product_matching: false for Starter (Pro+)
-- - ai_design_advice: false for Starter (Pro+)
-- - bulk_processing: false for Starter (Business+)
-- - team_collaboration: false for Starter (Business+)
-- - custom_brand_styles: false for Starter (Business+)
-- - whitelabel_reports: false for Starter (Business+)
-- - api_access: false for Starter (Business+)
--
-- These restrictions must be enforced in the application routes via middleware checks.
