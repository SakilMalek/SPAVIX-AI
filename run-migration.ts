import { Database } from './server/db';
import fs from 'fs';
import path from 'path';

/**
 * Split SQL statements while respecting dollar-quoted strings
 * PostgreSQL uses $$ as delimiters for function bodies
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarQuoteDelimiter = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    // Check for dollar quote start/end
    if (char === '$' && !inDollarQuote) {
      // Look ahead for the closing $
      let j = i + 1;
      while (j < sql.length && sql[j] !== '$') {
        j++;
      }
      if (j < sql.length) {
        dollarQuoteDelimiter = sql.substring(i, j + 1);
        inDollarQuote = true;
        current += dollarQuoteDelimiter;
        i = j + 1;
        continue;
      }
    } else if (inDollarQuote && sql.substring(i, i + dollarQuoteDelimiter.length) === dollarQuoteDelimiter) {
      inDollarQuote = false;
      current += dollarQuoteDelimiter;
      i += dollarQuoteDelimiter.length;
      continue;
    }

    // Handle semicolon as statement terminator (only outside dollar quotes)
    if (char === ';' && !inDollarQuote) {
      current += char;
      const trimmed = current.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed.length > 0 && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }

  return statements;
}

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
    let migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Skip migration 004 and old 005 (conflicts with existing schema) - use 005_fixed instead
    migrationFiles = migrationFiles.filter(file => 
      !file.startsWith('004_subscription_system') &&
      file !== '005_add_subscription_columns.sql'
    );

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`\n▶️  Running migration: ${file}`);
      
      try {
        // Split SQL into individual statements, respecting dollar-quoted strings
        const statements = splitSqlStatements(sql);

        for (const statement of statements) {
          try {
            await Database.query(statement);
          } catch (error: any) {
            // Skip if table/index already exists
            if (error.code === '42P07' || error.message?.includes('already exists')) {
              // Silently skip
            } else {
              throw error;
            }
          }
        }

        console.log(`✅ Completed: ${file}`);
      } catch (error: any) {
        console.error(`❌ Error in ${file}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
