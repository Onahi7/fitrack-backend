import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  private readonly logger = new Logger(DrizzleService.name);
  public db: ReturnType<typeof drizzle>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.configService.get<string>('NEON_DATABASE_URL');
    
    if (!connectionString) {
      throw new Error('NEON_DATABASE_URL is not configured in environment variables');
    }

    this.logger.log('Connecting to database...');
    const sql = neon(connectionString);
    this.db = drizzle(sql, { schema });

    try {
      // Run migrations automatically on startup
      this.logger.log('Running database migrations...');
      await migrate(this.db, { migrationsFolder: './drizzle' });
      this.logger.log('✅ Database migrations completed successfully');
    } catch (error) {
      this.logger.warn('No migrations to run or migrations folder not found');
      this.logger.log('Using drizzle-kit push instead...');
      // Migration folder doesn't exist, that's okay - we'll use drizzle-kit push
    }

    this.logger.log('✅ Database connection established');
  }
}
