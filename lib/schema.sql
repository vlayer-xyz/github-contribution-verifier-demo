-- Database schema for verified contributions
-- Run this SQL in your NeonDB database to create the table

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
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_github_username ON verified_contributions(github_username);
CREATE INDEX IF NOT EXISTS idx_repo ON verified_contributions(repo_owner, repo_name);

