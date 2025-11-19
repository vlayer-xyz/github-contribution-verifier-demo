#!/bin/bash

# Script to setup Neon database schema
# Usage: ./scripts/setup-db.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Please set it in your .env.local file or export it:"
  echo "export DATABASE_URL='your-neon-connection-string'"
  exit 1
fi

echo "Running database schema migration..."
psql "$DATABASE_URL" -f lib/schema.sql

if [ $? -eq 0 ]; then
  echo "✅ Database schema created successfully!"
else
  echo "❌ Error creating database schema"
  exit 1
fi

