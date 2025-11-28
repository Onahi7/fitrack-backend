@echo off
echo 🚀 Setting up FitTrack Database...
echo.

REM Check if .env exists
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please create a .env file with your database credentials.
    exit /b 1
)

echo ✅ .env file found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call pnpm install

REM Run migrations
echo.
echo 🔄 Running database migrations...
call pnpm drizzle-kit push:pg

if %errorlevel% equ 0 (
    echo.
    echo ✅ Database migrations completed successfully!
    echo.
    echo 📊 Tables created:
    echo   - users
    echo   - user_profiles
    echo   - meals
    echo   - streaks
    echo   - journal
    echo   - water
    echo   - buddy_pairs
    echo   - achievements
    echo   - user_achievements
    echo   - photos
    echo   - reports
    echo.
    echo 🎯 Next steps:
    echo   1. Start the server: pnpm start:dev
    echo   2. Seed achievements: curl -X POST http://localhost:3000/achievements/seed
    echo   3. Test the API: http://localhost:3000
) else (
    echo.
    echo ❌ Migration failed! Please check the error above.
    exit /b 1
)
