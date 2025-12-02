#!/usr/bin/env ts-node
/**
 * Seed 50 demo users with Nigerian names
 * Run: ts-node src/scripts/seed-demo-users.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DrizzleService } from '../database/drizzle.service';
import { users, userProfiles } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as admin from 'firebase-admin';

// 50 Real Nigerian names (mix of different ethnic groups)
const NIGERIAN_NAMES = [
  { firstName: 'Chukwuemeka', lastName: 'Okafor', gender: 'male' },
  { firstName: 'Adaeze', lastName: 'Nwosu', gender: 'female' },
  { firstName: 'Oluwaseun', lastName: 'Adeleke', gender: 'male' },
  { firstName: 'Chiamaka', lastName: 'Eze', gender: 'female' },
  { firstName: 'Babatunde', lastName: 'Ogunleye', gender: 'male' },
  { firstName: 'Folake', lastName: 'Adeyemi', gender: 'female' },
  { firstName: 'Chinedu', lastName: 'Okeke', gender: 'male' },
  { firstName: 'Ngozi', lastName: 'Chibueze', gender: 'female' },
  { firstName: 'Temitope', lastName: 'Olaleye', gender: 'male' },
  { firstName: 'Amaka', lastName: 'Nnamdi', gender: 'female' },
  { firstName: 'Ikechukwu', lastName: 'Okonkwo', gender: 'male' },
  { firstName: 'Chinwe', lastName: 'Obi', gender: 'female' },
  { firstName: 'Oluwatobi', lastName: 'Akinola', gender: 'male' },
  { firstName: 'Yetunde', lastName: 'Bakare', gender: 'female' },
  { firstName: 'Emeka', lastName: 'Udofia', gender: 'male' },
  { firstName: 'Blessing', lastName: 'Okoro', gender: 'female' },
  { firstName: 'Chidiebere', lastName: 'Nnaji', gender: 'male' },
  { firstName: 'Nneka', lastName: 'Mbah', gender: 'female' },
  { firstName: 'Ayodele', lastName: 'Fashola', gender: 'male' },
  { firstName: 'Tobiloba', lastName: 'Dosunmu', gender: 'female' },
  { firstName: 'Obinna', lastName: 'Ugwu', gender: 'male' },
  { firstName: 'Chioma', lastName: 'Onyekaozuru', gender: 'female' },
  { firstName: 'Olumide', lastName: 'Ogunbiyi', gender: 'male' },
  { firstName: 'Funke', lastName: 'Adebayo', gender: 'female' },
  { firstName: 'Ifeanyi', lastName: 'Ndukwe', gender: 'male' },
  { firstName: 'Nkechi', lastName: 'Okafor', gender: 'female' },
  { firstName: 'Segun', lastName: 'Olaniyan', gender: 'male' },
  { firstName: 'Chinenye', lastName: 'Agu', gender: 'female' },
  { firstName: 'Kunle', lastName: 'Alabi', gender: 'male' },
  { firstName: 'Ebere', lastName: 'Nwankwo', gender: 'female' },
  { firstName: 'Tunde', lastName: 'Odunsi', gender: 'male' },
  { firstName: 'Adanna', lastName: 'Nwachukwu', gender: 'female' },
  { firstName: 'Bola', lastName: 'Ajayi', gender: 'male' },
  { firstName: 'Ifeoma', lastName: 'Okeke', gender: 'female' },
  { firstName: 'Adebayo', lastName: 'Oladipo', gender: 'male' },
  { firstName: 'Uju', lastName: 'Chukwu', gender: 'female' },
  { firstName: 'Kelechi', lastName: 'Emenike', gender: 'male' },
  { firstName: 'Onyinye', lastName: 'Okoye', gender: 'female' },
  { firstName: 'Chibuike', lastName: 'Anyanwu', gender: 'male' },
  { firstName: 'Amarachi', lastName: 'Ike', gender: 'female' },
  { firstName: 'Adeyinka', lastName: 'Ogunwale', gender: 'male' },
  { firstName: 'Chizoba', lastName: 'Ezeani', gender: 'female' },
  { firstName: 'Oluwafemi', lastName: 'Oyewole', gender: 'male' },
  { firstName: 'Uchechi', lastName: 'Okoro', gender: 'female' },
  { firstName: 'Gbenga', lastName: 'Olowu', gender: 'male' },
  { firstName: 'Obiageli', lastName: 'Nnamani', gender: 'female' },
  { firstName: 'Nnamdi', lastName: 'Azikiwe', gender: 'male' },
  { firstName: 'Chinaza', lastName: 'Onwuka', gender: 'female' },
  { firstName: 'Biodun', lastName: 'Ogunleye', gender: 'male' },
  { firstName: 'Ebuka', lastName: 'Obi', gender: 'male' },
];

const DEFAULT_PASSWORD = 'Demo@123';

async function seedDemoUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const drizzleService = app.get(DrizzleService);
  const db = drizzleService.db;

  console.log('🌱 Starting demo user seeding...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < NIGERIAN_NAMES.length; i++) {
    const { firstName, lastName, gender } = NIGERIAN_NAMES[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.fittrack.com`;
    const displayName = `${firstName} ${lastName}`;

    try {
      // Create Firebase user
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
        console.log(`✓ User already exists in Firebase: ${displayName}`);
      } catch (error) {
        // User doesn't exist, create new one
        firebaseUser = await admin.auth().createUser({
          email,
          password: DEFAULT_PASSWORD,
          displayName,
          emailVerified: true,
        });
        console.log(`✓ Created Firebase user: ${displayName}`);
      }

      // Check if user exists in database
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, firebaseUser.uid))
        .limit(1);

      if (existingUser.length === 0) {
        // Create user in database
        await db.insert(users).values({
          id: firebaseUser.uid,
          email,
          displayName,
          photoURL: null,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create user profile with realistic fitness data
        const startingWeight = gender === 'male' ? 75 + Math.random() * 25 : 60 + Math.random() * 20;
        const weightLoss = Math.random() * 10;
        const currentWeight = startingWeight - weightLoss;
        const goalWeight = startingWeight - (10 + Math.random() * 15);

        await db.insert(userProfiles).values({
          userId: firebaseUser.uid,
          startingWeight: startingWeight.toFixed(2),
          currentWeight: currentWeight.toFixed(2),
          goalWeight: goalWeight.toFixed(2),
          height: (gender === 'male' ? 170 + Math.random() * 20 : 155 + Math.random() * 20).toFixed(2),
          dailyCalorieGoal: (gender === 'male' ? 2000 + Math.random() * 500 : 1600 + Math.random() * 400).toFixed(2),
          dailyWaterGoal: '8',
          setupCompleted: true,
          tutorialCompleted: true,
          fastingProtocol: Math.random() > 0.5 ? '16:8' : '18:6',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✓ Created database records for: ${displayName} (${email})`);
      } else {
        console.log(`ℹ User already exists in database: ${displayName}`);
      }

      successCount++;
    } catch (error) {
      console.error(`✗ Error creating user ${displayName}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✓ Successfully created/verified: ${successCount} users`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log('\n🔑 Demo Login Credentials:');
  console.log(`Email: [firstname].[lastname]@demo.fittrack.com`);
  console.log(`Password: ${DEFAULT_PASSWORD}`);
  console.log(`\nExample: chukwuemeka.okafor@demo.fittrack.com / ${DEFAULT_PASSWORD}\n`);

  await app.close();
}

seedDemoUsers()
  .then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
