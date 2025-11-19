// Script to setup Neon database schema using Node.js
// Usage: 
//   Option 1: DATABASE_URL='your-connection-string' node scripts/setup-db.js
//   Option 2: node scripts/setup-db.js (will prompt for connection string)

const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');

let DATABASE_URL = process.env.DATABASE_URL;

// Helper function to execute raw SQL using template literals
async function executeRawSQL(sql, statement) {
  // Create a template literal function that will be called with the statement
  // We use a workaround: construct the template literal by creating a function
  // that returns the result of calling sql with the statement as a template literal
  const templateParts = [statement];
  templateParts.raw = [statement];
  return await sql(templateParts);
}

async function setupDatabase() {
  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    console.error('\nPlease run the script with DATABASE_URL:');
    console.error("  DATABASE_URL='your-neon-connection-string' node scripts/setup-db.js");
    console.error('\nOr get your connection string from: https://console.neon.tech');
    process.exit(1);
  }
  try {
    const sql = neon(DATABASE_URL);
    const schemaPath = join(__dirname, '..', 'lib', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    
    console.log('Running database schema migration...');
    
    // Execute the SQL directly - neon can handle multi-statement SQL
    // We'll execute the entire SQL file as one statement
    const cleanSQL = schemaSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    
    // Split by semicolon and execute each statement
    const statements = cleanSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      if (statement) {
        // Use Function to dynamically create a tagged template call
        // This is safe because we control the SQL content
        const func = new Function('sql', `return sql\`${statement.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\``);
        await func(sql);
      }
    }
    
    console.log('✅ Database schema created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

setupDatabase();

