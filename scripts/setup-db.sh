#!/bin/bash

# TCG Social Hub - Database Setup Script

echo "🗄️  TCG Social Hub - Database Setup"
echo "====================================\n"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "\nPlease set your Neon database URL:"
    echo "export DATABASE_URL='postgresql://user:password@host/database'"
    echo "\nOr add it to your .env.local file"
    exit 1
fi

echo "✓ DATABASE_URL found"
echo "\nRunning database schema..."

# Run the schema
psql "$DATABASE_URL" -f lib/db-schema.sql

if [ $? -eq 0 ]; then
    echo "\n✅ Database setup complete!"
    echo "\nYour TCG Social Hub database is ready with:"
    echo "  - Users & authentication tables"
    echo "  - Collection & favorites tables"
    echo "  - Social feed tables (posts, comments, likes)"
    echo "  - Friends & groups tables"
    echo "  - Messages & conversations tables"
    echo "  - Marketplace & trades tables"
    echo "  - Notifications table"
    echo "\nNext steps:"
    echo "  1. npm install"
    echo "  2. npm run dev"
    echo "  3. Open http://localhost:3000"
else
    echo "\n❌ Database setup failed"
    echo "\nPlease check:"
    echo "  1. Your DATABASE_URL is correct"
    echo "  2. You have psql installed"
    echo "  3. Your database is accessible"
    exit 1
fi
