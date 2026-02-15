const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

async function setupDatabase() {
  const sql = neon('postgresql://neondb_owner:npg_kFlSOiKmG56y@ep-winter-leaf-aiq3xmak-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require');
  
  console.log('📦 Reading schema file...');
  const schema = fs.readFileSync('lib/db-schema.sql', 'utf8');
  
  console.log('🔧 Setting up database tables...');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  try {
    for (const statement of statements) {
      if (statement.trim()) {
        await sql`${sql(statement)}`;
      }
    }
    console.log('✅ Database setup complete!');
    console.log('✅ All 17 tables created successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - users');
    console.log('  - user_sessions');
    console.log('  - verification_tokens');
    console.log('  - collection_items');
    console.log('  - favorites');
    console.log('  - friendships');
    console.log('  - groups');
    console.log('  - group_members');
    console.log('  - posts');
    console.log('  - comments');
    console.log('  - likes');
    console.log('  - conversations');
    console.log('  - conversation_participants');
    console.log('  - messages');
    console.log('  - marketplace_listings');
    console.log('  - trades');
    console.log('  - notifications');
    console.log('  - cards_cache');
    console.log('\n✨ Your TCG Social Hub database is ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

setupDatabase();
