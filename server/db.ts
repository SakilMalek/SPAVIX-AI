import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
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
      max: 10,
      min: 0,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
      statement_timeout: 60000,
      application_name: 'spavix-api',
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      pool = null;
    });

    pool.on('connect', () => {
      console.log('New database connection established');
    });
  }

  return pool;
}

export class Database {
  static async query(text: string, params?: unknown[], retries: number = 3): Promise<QueryResult> {
    try {
      return await getPool().query(text, params);
    } catch (error: any) {
      // Retry on SSL/connection errors
      if (retries > 0 && (error.code === 'ECONNREFUSED' || error.message?.includes('SSL') || error.message?.includes('decryption'))) {
        console.warn(`Query failed, retrying... (${retries} retries left)`, error.message);
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
    const result = await this.query('SELECT id, email, name, picture FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateUserProfile(id: string, name?: string, picture?: string): Promise<void> {
    await this.query(
      'UPDATE users SET name = COALESCE($2, name), picture = COALESCE($3, picture), updated_at = NOW() WHERE id = $1',
      [id, name || null, picture || null]
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

  static async getGenerations(userId: string, limit = 20, offset = 0): Promise<unknown[]> {
    const result = await this.query(
      'SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
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
}
