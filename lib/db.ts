import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

// Initialize database schema
export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS verified_contributions (
        id SERIAL PRIMARY KEY,
        github_username TEXT NOT NULL,
        repo_owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        contribution_count INTEGER NOT NULL,
        proof JSONB NOT NULL,
        avatar_url TEXT,
        github_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(github_username, repo_owner, repo_name)
      )
    `;
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

