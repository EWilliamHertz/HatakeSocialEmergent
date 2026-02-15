const { Client } = require('pg');
const fs = require('fs');

async function setup() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_kFlSOiKmG56y@ep-winter-leaf-aiq3xmak-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    console.log('📦 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');
    
    console.log('📖 Reading schema...');
    const schema = fs.readFileSync('lib/db-schema.sql', 'utf8');
    
    console.log('🔧 Creating tables...');
    await client.query(schema);
    
    console.log('✅ Database setup complete! All tables created.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setup();
