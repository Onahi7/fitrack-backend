# FitTrack Backend

NestJS backend API for FitTrack wellness tracking application.

## Tech Stack

- **Framework:** NestJS 10
- **Database:** Neon PostgreSQL (with Drizzle ORM)
- **Authentication:** Firebase Admin SDK
- **Storage:** Cloudinary
- **Email:** Resend
- **Deployment:** DigitalOcean App Platform

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Database Migration

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server will run on `http://localhost:3000/api`

## API Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/me` - Get current user
- `GET /api/users/me/profile` - Get profile
- `PUT /api/users/me/profile` - Update profile
- `DELETE /api/users/me` - Delete account

### Meals
- `POST /api/meals` - Log meal
- `GET /api/meals?date=YYYY-MM-DD` - Get meals
- `GET /api/meals/stats/daily?date=YYYY-MM-DD` - Get daily stats
- `DELETE /api/meals/:id` - Delete meal

### Streaks
- `GET /api/streaks` - Get all streaks
- `POST /api/streaks/checkin` - Check in

### Journal
- `POST /api/journal` - Create entry
- `GET /api/journal?date=YYYY-MM-DD` - Get entries
- `DELETE /api/journal/:id` - Delete entry

### Water
- `POST /api/water` - Log water
- `GET /api/water?date=YYYY-MM-DD` - Get logs

## Deployment

### DigitalOcean App Platform

1. Push code to GitHub
2. Go to DigitalOcean → Create App
3. Connect GitHub repo
4. Add environment variables
5. Deploy!

Cost: $5/month

## Scripts

- `npm run build` - Build production
- `npm run start` - Start production
- `npm run start:dev` - Start development
- `npm run migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

## License

MIT
