import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.NEON_DATABASE_URL!,
    ssl: true,
  },
  verbose: true,
  strict: true,
} satisfies Config;
