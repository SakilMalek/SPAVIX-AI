/**
 * Type-safe database entity definitions
 * Generated from schema to ensure type safety across queries
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  picture?: string;
  privacy_consent: boolean;
  terms_consent: boolean;
  marketing_consent: boolean;
  consent_timestamp?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Generation {
  id: string;
  user_id: string;
  project_id?: string;
  before_image_url: string;
  after_image_url: string;
  style: string;
  materials: GenerationMaterials;
  room_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface GenerationMaterials {
  wallColor?: string;
  floorType?: string;
  curtainType?: string;
  lightingMood?: string;
  accentWall?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TransformationHistory {
  id: string;
  generation_id: string;
  user_id: string;
  version_number: number;
  before_image_url: string;
  after_image_url: string;
  style: string;
  materials: GenerationMaterials;
  room_type: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
}

export interface Share {
  id: string;
  generation_id: string;
  user_id: string;
  share_id: string;
  created_at: Date;
  expires_at?: Date;
}

export interface ShoppingList {
  id: string;
  generation_id: string;
  user_id: string;
  shopping_list: Record<string, unknown>;
  created_at: Date;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

/**
 * Query result types for type-safe database operations
 */

export interface CreateUserResult {
  id: string;
}

export interface CreateGenerationResult {
  id: string;
}

export interface CreateProjectResult {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface GetUserResult extends Omit<User, 'password_hash'> {}

export interface GetGenerationResult extends Generation {}

export interface ListGenerationsResult extends Generation {}

export interface ListProjectsResult extends Project {}

export interface GetProjectResult extends Project {}
