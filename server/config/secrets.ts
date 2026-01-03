/**
 * Secure secrets management
 * Enforces required environment variables at startup
 */

export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. ' +
      'Please set JWT_SECRET to a strong random string (minimum 32 characters). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be at least 32 characters long. ' +
      `Current length: ${secret.length}. ` +
      'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return secret;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  
  if (!secret) {
    throw new Error(
      'FATAL: SESSION_SECRET environment variable is required. ' +
      'Please set SESSION_SECRET to a strong random string (minimum 32 characters). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'FATAL: SESSION_SECRET must be at least 32 characters long. ' +
      `Current length: ${secret.length}. ` +
      'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return secret;
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  
  if (!key) {
    throw new Error(
      'FATAL: GEMINI_API_KEY environment variable is required. ' +
      'Please set GEMINI_API_KEY to your Google Gemini API key.'
    );
  }

  return key;
}

export function validateRequiredSecrets(): void {
  try {
    getJWTSecret();
    getSessionSecret();
    getGeminiApiKey();
    console.log('✅ All required secrets validated successfully');
  } catch (error) {
    console.error('❌ Secret validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
