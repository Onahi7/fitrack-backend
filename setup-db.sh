#!/bin/bash

echo "🚀 Setting up FitTrack Database..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your database credentials."
    exit 1
fi

# Load environment variables
source .env

# Check if database URL is set
if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ Error: NEON_DATABASE_URL not set in .env"
    exit 1
fi

echo "✅ Database URL found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Run migrations
echo ""
echo "🔄 Running database migrations..."
pnpm drizzle-kit push:pg

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database migrations completed successfully!"
    echo ""
    echo "📊 Tables created:"
    echo "  - users"
    echo "  - user_profiles"
    echo "  - meals"
    echo "  - streaks"
    echo "  - journal"
    echo "  - water"
    echo "  - buddy_pairs"
    echo "  - achievements"
    echo "  - user_achievements"
    echo "  - photos"
    echo "  - reports"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Start the server: pnpm start:dev"
    echo "  2. Seed achievements: curl -X POST http://localhost:3000/achievements/seed"
    echo "  3. Test the API: http://localhost:3000"
else
    echo ""
    echo "❌ Migration failed! Please check the error above."
    exit 1
fi
