#!/usr/bin/env ts-node
/**
 * Generate VAPID keys for Web Push notifications
 * Run: pnpm run generate:vapid
 */
import * as webPush from 'web-push';

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n🔐 VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com\n`);
console.log('⚠️  Keep the private key secret! Do not commit it to version control.\n');
