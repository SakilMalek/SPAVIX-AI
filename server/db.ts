import { Pool, QueryResult } from 'pg';
import { logger } from './utils/logger.js';
import { logQuery, logSlowQuery } from './middleware/queryLogger.js';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('Connecting to database...');

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,                    // Increased from 10 for better concurrency
      min: 2,                     // Maintain minimum connections
      idleTimeoutMillis: 30000,   // Reduced from 60000 for faster cleanup
      connectionTimeoutMillis: 15000, // Increased to 15s for stable connections
      statement_timeout: 30000,   // Reduced from 60000 for query timeout
      application_name: 'spavix-api',
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      pool = null;
    });

    pool.on('connect', () => {
      console.log('New database connection established');
    });

    // Log pool stats periodically in development
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        console.log('[DB Pool Stats]', {
          totalCount: pool?.totalCount,
          idleCount: pool?.idleCount,
          waitingCount: pool?.waitingCount,
        });
      }, 60000); // Every minute
    }
  }

  return pool;
}

export class Database {
  static async query(text: string, params?: unknown[], retries: number = 3): Promise<QueryResult> {
    const startTime = Date.now();
    try {
      const result = await getPool().query(text, params);
      const duration = Date.now() - startTime;
      
      // Log query execution
      logQuery({ query: text, params, duration, rowCount: result.rowCount || undefined });
      logSlowQuery({ query: text, params, duration, rowCount: result.rowCount || undefined });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Log query error
      logQuery({ query: text, params, duration, error: error as Error });
      
      // Retry on SSL/connection errors
      if (retries > 0 && (error.code === 'ECONNREFUSED' || error.message?.includes('SSL') || error.message?.includes('decryption'))) {
        logger.warn(`Query failed, retrying... (${retries} retries left)`, { query: text, error: error.message });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.query(text, params, retries - 1);
      }
      throw error;
    }
  }

  static async createUser(email: string, passwordHash: string, name?: string, picture?: string): Promise<{ id: string }> {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, name, picture, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [email, passwordHash, name || null, picture || null]
    );
    return result.rows[0];
  }

  static async getUserByEmail(email: string): Promise<{ id: string; email: string; password_hash: string; name?: string; picture?: string } | null> {
    const result = await this.query('SELECT id, email, password_hash, name, picture FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async getUserById(id: string): Promise<{ id: string; email: string; name?: string; picture?: string } | null> {
    const result = await this.query(
      `SELECT id, email, name, picture
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async getUserByIdWithPassword(id: string): Promise<{ id: string; email: string; name?: string; picture?: string; passwordHash: string } | null> {
    const result = await this.query(
      `SELECT id, email, name, picture, password_hash as "passwordHash"
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async updateUserProfile(id: string, name?: string, picture?: string): Promise<void> {
    await this.query(
      'UPDATE users SET name = COALESCE($2, name), picture = COALESCE($3, picture), updated_at = NOW() WHERE id = $1',
      [id, name || null, picture || null]
    );
  }

  static async deleteUser(id: string): Promise<void> {
    await this.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
  }

  // ============================================
  // SESSION MANAGEMENT (Phase 2)
  // ============================================

  static async createSession(
    userId: string,
    refreshTokenHash: string,
    accessTokenHash: string,
    expiresAt: Date,
    deviceInfo?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, access_token_hash, device_info, ip_address, user_agent, expires_at, created_at, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [userId, refreshTokenHash, accessTokenHash, deviceInfo ? JSON.stringify(deviceInfo) : null, ipAddress, userAgent, expiresAt]
    );
    return result.rows[0];
  }

  static async getSessionByRefreshToken(refreshTokenHash: string): Promise<{
    id: string;
    user_id: string;
    refresh_token_hash: string;
    access_token_hash: string;
    expires_at: Date;
    is_active: boolean;
  } | null> {
    const result = await this.query(
      `SELECT id, user_id, refresh_token_hash, access_token_hash, expires_at, is_active
       FROM sessions
       WHERE refresh_token_hash = $1 AND is_active = true AND expires_at > NOW()`,
      [refreshTokenHash]
    );
    return result.rows[0] || null;
  }

  static async updateSessionAccessToken(sessionId: string, accessTokenHash: string): Promise<void> {
    await this.query(
      `UPDATE sessions
       SET access_token_hash = $2, last_activity = NOW()
       WHERE id = $1`,
      [sessionId, accessTokenHash]
    );
  }

  static async revokeSession(sessionId: string): Promise<void> {
    await this.query(
      `UPDATE sessions
       SET is_active = false
       WHERE id = $1`,
      [sessionId]
    );
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await this.query(
      `UPDATE sessions
       SET is_active = false
       WHERE user_id = $1`,
      [userId]
    );
  }

  static async getUserActiveSessions(userId: string): Promise<any[]> {
    const result = await this.query(
      `SELECT id, device_info, ip_address, user_agent, created_at, last_activity
       FROM sessions
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [userId]
    );
    return result.rows;
  }

  static async cleanupExpiredSessions(): Promise<number> {
    const result = await this.query(
      `DELETE FROM sessions WHERE expires_at < NOW() RETURNING id`
    );
    return result.rowCount || 0;
  }

  static async recordUserConsent(
    userId: string,
    privacyConsent: boolean,
    termsConsent: boolean,
    marketingConsent: boolean
  ): Promise<void> {
    await this.query(
      `UPDATE users SET 
        privacy_consent = $2,
        terms_consent = $3,
        marketing_consent = $4,
        consent_timestamp = NOW()
      WHERE id = $1`,
      [userId, privacyConsent, termsConsent, marketingConsent]
    );
  }

  static async withdrawConsent(userId: string, consentType: string): Promise<void> {
    const columnMap: Record<string, string> = {
      privacy: 'privacy_consent',
      terms: 'terms_consent',
      marketing: 'marketing_consent'
    };

    const column = columnMap[consentType];
    if (!column) {
      throw new Error('Invalid consent type');
    }

    await this.query(
      `UPDATE users SET ${column} = false, consent_timestamp = NOW() WHERE id = $1`,
      [userId]
    );
  }

  static async saveGeneration(
    userId: string,
    beforeImageUrl: string,
    afterImageUrl: string,
    style: string,
    materials: Record<string, string>,
    roomType: string,
    projectId?: string
  ): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO generations (user_id, project_id, before_image_url, after_image_url, style, materials, room_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [userId, projectId || null, beforeImageUrl, afterImageUrl, style, JSON.stringify(materials), roomType]
    );
    return result.rows[0];
  }

  static async getGenerations(userId: string, limit: number = 20, offset: number = 0): Promise<unknown[]> {
    const queryStart = Date.now();
    console.log(`[DB] Starting getGenerations query for user ${userId} (limit=${limit}, offset=${offset})`);
    
    const result = await this.query(
      'SELECT id, user_id, project_id, style, materials, room_type, created_at, updated_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    const queryDuration = Date.now() - queryStart;
    console.log(`[DB] getGenerations query completed in ${queryDuration}ms, returned ${result.rows.length} rows`);
    
    return result.rows;
  }

  static async getGenerationById(id: string, userId: string): Promise<{
    id: string;
    user_id: string;
    project_id: string | null;
    before_image_url: string;
    after_image_url: string;
    style: string;
    materials: any;
    room_type: string;
    created_at: string;
  } | null> {
    const result = await this.query(
      'SELECT * FROM generations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static async getGenerationsByProjectId(projectId: string, userId: string): Promise<any[]> {
    const result = await this.query(
      `SELECT * FROM generations 
       WHERE project_id = $1 AND user_id = $2 
       ORDER BY created_at DESC`,
      [projectId, userId]
    );
    return result.rows;
  }

  static async updateGenerationProject(generationId: string, userId: string, projectId: string | null): Promise<any> {
    const result = await this.query(
      `UPDATE generations 
       SET project_id = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [projectId, generationId, userId]
    );
    return result.rows[0] || null;
  }

  static async initializeDatabase(): Promise<void> {
    // Check if tables already exist to skip initialization
    try {
      const result = await this.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      if (result.rows[0]?.exists) {
        console.log('✅ Database tables already initialized, skipping initialization');
        return;
      }
    } catch (error) {
      console.log('Could not check if tables exist, proceeding with initialization');
    }

    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          picture TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (error) {
      console.log('Users table creation (may already exist):', error);
    }

    try {
      await this.query(`
        ALTER TABLE users ADD COLUMN name VARCHAR(255);
      `);
      console.log('Added name column to users table');
    } catch (error: any) {
      if (error.code !== '42701') {
        console.log('Name column already exists or error:', error.message);
      }
    }

    try {
      await this.query(`
        ALTER TABLE users ADD COLUMN picture TEXT;
      `);
      console.log('Added picture column to users table');
    } catch (error: any) {
      if (error.code !== '42701') {
        console.log('Picture column already exists or error:', error.message);
      }
    }

    try {
      await this.query(`
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('Added updated_at column to users table');
    } catch (error: any) {
      if (error.code !== '42701') {
        console.log('Updated_at column already exists or error:', error.message);
      }
    }

    // Create projects table first (before generations references it)
    await this.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
    `);

    // Now add project_id column to generations if it doesn't exist
    try {
      await this.query(`
        ALTER TABLE generations ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
      `);
      console.log('Added project_id column to generations table');
    } catch (error: any) {
      if (error.code !== '42701') {
        console.log('Project_id column already exists or error:', error.message);
      }
    }

    try {
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
      `);
      console.log('Added index on generations.project_id');
    } catch (error: any) {
      console.log('Index already exists or error:', error.message);
    }

    await this.query(`

      CREATE TABLE IF NOT EXISTS generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        before_image_url TEXT NOT NULL,
        after_image_url TEXT NOT NULL,
        style VARCHAR(100) NOT NULL,
        materials JSONB,
        room_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
      CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
      CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

      CREATE TABLE IF NOT EXISTS shopping_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shopping_list JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shopping_lists_generation_id ON shopping_lists(generation_id);
      CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);

      CREATE TABLE IF NOT EXISTS shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        share_id VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shares_share_id ON shares(share_id);
      CREATE INDEX IF NOT EXISTS idx_shares_generation_id ON shares(generation_id);
      CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);

      CREATE TABLE IF NOT EXISTS project_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        share_id VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_project_shares_share_id ON project_shares(share_id);
      CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_shares_user_id ON project_shares(user_id);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

      CREATE TABLE IF NOT EXISTS transformation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        before_image_url TEXT NOT NULL,
        after_image_url TEXT NOT NULL,
        style VARCHAR(100) NOT NULL,
        materials JSONB,
        room_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transformation_history_generation_id ON transformation_history(generation_id);
      CREATE INDEX IF NOT EXISTS idx_transformation_history_user_id ON transformation_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_transformation_history_created_at ON transformation_history(created_at);

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
    `);
  }

  static async saveShoppingList(
    generationId: string,
    userId: string,
    shoppingList: string
  ): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO shopping_lists (generation_id, user_id, shopping_list, created_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       RETURNING id`,
      [generationId, userId, JSON.stringify({ content: shoppingList })]
    );
    return result.rows[0];
  }

  static async getShoppingList(generationId: string, userId: string): Promise<string | null> {
    const result = await this.query(
      'SELECT shopping_list FROM shopping_lists WHERE generation_id = $1 AND user_id = $2 LIMIT 1',
      [generationId, userId]
    );
    if (result.rows[0]?.shopping_list) {
      const data = result.rows[0].shopping_list;
      return typeof data === 'string' ? data : data.content || null;
    }
    return null;
  }

  static async saveTransformationHistory(
    generationId: string,
    userId: string,
    versionNumber: number,
    beforeImageUrl: string,
    afterImageUrl: string,
    style: string,
    materials: Record<string, string>,
    roomType: string,
    status: string = 'completed'
  ): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO transformation_history (generation_id, user_id, version_number, before_image_url, after_image_url, style, materials, room_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id`,
      [generationId, userId, versionNumber, beforeImageUrl, afterImageUrl, style, JSON.stringify(materials), roomType, status]
    );
    return result.rows[0];
  }

  static async getTransformationHistory(generationId: string, userId: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const result = await this.query(
      `SELECT id, generation_id, user_id, version_number, style, room_type, status, created_at 
       FROM transformation_history 
       WHERE generation_id = $1 AND user_id = $2 
       ORDER BY version_number DESC
       LIMIT $3 OFFSET $4`,
      [generationId, userId, limit, offset]
    );
    return result.rows;
  }

  static async getTransformationHistoryCount(generationId: string, userId: string): Promise<number> {
    const result = await this.query(
      `SELECT COUNT(*) as count FROM transformation_history 
       WHERE generation_id = $1 AND user_id = $2`,
      [generationId, userId]
    );
    return result.rows[0]?.count || 0;
  }

  static async getTransformationHistoryWithImages(generationId: string, userId: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const result = await this.query(
      `SELECT * FROM transformation_history 
       WHERE generation_id = $1 AND user_id = $2 
       ORDER BY version_number DESC
       LIMIT $3 OFFSET $4`,
      [generationId, userId, limit, offset]
    );
    return result.rows;
  }

  static async getTransformationVersion(generationId: string, userId: string, versionNumber: number): Promise<any> {
    const result = await this.query(
      `SELECT * FROM transformation_history 
       WHERE generation_id = $1 AND user_id = $2 AND version_number = $3`,
      [generationId, userId, versionNumber]
    );
    return result.rows[0] || null;
  }

  static async getLatestTransformationVersion(generationId: string, userId: string): Promise<any> {
    const result = await this.query(
      `SELECT * FROM transformation_history 
       WHERE generation_id = $1 AND user_id = $2 
       ORDER BY version_number DESC 
       LIMIT 1`,
      [generationId, userId]
    );
    return result.rows[0] || null;
  }

  static async getNextVersionNumber(generationId: string): Promise<number> {
    const result = await this.query(
      `SELECT MAX(version_number) as max_version FROM transformation_history WHERE generation_id = $1`,
      [generationId]
    );
    const maxVersion = result.rows[0]?.max_version || 0;
    return maxVersion + 1;
  }

  static async createShare(
    generationId: string,
    userId: string,
    shareId: string
  ): Promise<{ shareId: string }> {
    const result = await this.query(
      `INSERT INTO shares (generation_id, user_id, share_id, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING share_id`,
      [generationId, userId, shareId]
    );
    return result.rows[0];
  }

  static async getSharedGeneration(shareId: string): Promise<any> {
    const result = await this.query(
      `SELECT g.* FROM generations g
       INNER JOIN shares s ON g.id = s.generation_id
       WHERE s.share_id = $1`,
      [shareId]
    );
    return result.rows[0] || null;
  }

  static async getShareByGenerationId(generationId: string): Promise<any> {
    const result = await this.query(
      `SELECT * FROM shares WHERE generation_id = $1`,
      [generationId]
    );
    return result.rows[0] || null;
  }

  static async createProject(
    userId: string,
    name: string,
    description: string
  ): Promise<any> {
    const result = await this.query(
      `INSERT INTO projects (user_id, name, description, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, name, description, created_at, updated_at`,
      [userId, name, description]
    );
    return result.rows[0];
  }

  static async getProjects(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    const result = await this.query(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getProjectById(projectId: string, userId: string): Promise<any> {
    const result = await this.query(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM projects
       WHERE id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return result.rows[0] || null;
  }

  static async updateProject(
    projectId: string,
    userId: string,
    name: string,
    description: string
  ): Promise<any> {
    const result = await this.query(
      `UPDATE projects
       SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, user_id, name, description, created_at, updated_at`,
      [name, description, projectId, userId]
    );
    return result.rows[0] || null;
  }

  static async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM projects
       WHERE id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async searchProjects(userId: string, searchTerm: string): Promise<any[]> {
    const result = await this.query(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM projects
       WHERE user_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY created_at DESC`,
      [userId, `%${searchTerm}%`]
    );
    return result.rows;
  }

  static async createProjectShare(
    projectId: string,
    userId: string,
    shareId: string
  ): Promise<{ shareId: string }> {
    const result = await this.query(
      `INSERT INTO project_shares (project_id, user_id, share_id, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING share_id`,
      [projectId, userId, shareId]
    );
    return result.rows[0];
  }

  static async getSharedProject(shareId: string): Promise<any> {
    const result = await this.query(
      `SELECT p.* FROM projects p
       INNER JOIN project_shares ps ON p.id = ps.project_id
       WHERE ps.share_id = $1`,
      [shareId]
    );
    return result.rows[0] || null;
  }

  static async getProjectShareByProjectId(projectId: string): Promise<any> {
    const result = await this.query(
      `SELECT * FROM project_shares WHERE project_id = $1`,
      [projectId]
    );
    return result.rows[0] || null;
  }

  static async deleteProjectShare(projectId: string, userId: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM project_shares
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async saveChatMessage(
    projectId: string,
    userId: string,
    role: "user" | "bot",
    content: string
  ): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO chat_messages (project_id, user_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [projectId, userId, role, content]
    );
    return result.rows[0];
  }

  static async getChatMessages(projectId: string, userId: string): Promise<any[]> {
    const result = await this.query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [projectId, userId]
    );
    return result.rows;
  }

  static async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const result = await this.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<{ id: string }> {
    const result = await this.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  }

  static async getPasswordResetToken(token: string): Promise<{ id: string; user_id: string; expires_at: string } | null> {
    const result = await this.query(
      `SELECT id, user_id, expires_at FROM password_reset_tokens 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async deletePasswordResetToken(token: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM password_reset_tokens WHERE token = $1`,
      [token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async deleteExpiredPasswordResetTokens(): Promise<void> {
    await this.query(
      `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
    );
  }
}
