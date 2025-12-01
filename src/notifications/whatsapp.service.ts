import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private twilioClient: twilio.Twilio | null = null;
  private whatsappNumber: string;

  constructor() {
    // Initialize Twilio client if credentials are provided
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';

    if (accountSid && authToken && this.whatsappNumber) {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('✅ WhatsApp service initialized with Twilio');
    } else {
      this.logger.warn('⚠️  WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env');
    }
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    return this.twilioClient !== null;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.warn('WhatsApp not configured. Skipping message.');
      return false;
    }

    try {
      // Ensure phone number has country code
      const formattedNumber = to.startsWith('+') ? to : `+${to}`;

      const result = await this.twilioClient.messages.create({
        from: `whatsapp:${this.whatsappNumber}`,
        to: `whatsapp:${formattedNumber}`,
        body: message,
      });

      this.logger.log(`✅ WhatsApp sent to ${formattedNumber}. SID: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send WhatsApp to ${to}:`, error.message);
      return false;
    }
  }

  /**
   * Send water reminder
   */
  async sendWaterReminder(to: string, userName: string): Promise<boolean> {
    const messages = [
      `💧 Hey ${userName}! Time to hydrate! Drink a glass of water and log it in the app.`,
      `🌊 ${userName}, don't forget to drink water! Your body needs it. Log your intake now!`,
      `💦 Hydration check! ${userName}, grab a glass of water and track it in Intentional.`,
      `🥤 ${userName}, it's water time! Stay hydrated and log your progress.`,
      `🌟 ${userName}, keep that wellness streak going! Drink water and log it now.`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return this.sendMessage(to, randomMessage);
  }

  /**
   * Send meal reminder
   */
  async sendMealReminder(to: string, userName: string, mealType: string): Promise<boolean> {
    const message = `🍽️ Hi ${userName}! Time to log your ${mealType}. Keep track of your nutrition in the Intentional app!`;
    return this.sendMessage(to, message);
  }

  /**
   * Send workout reminder
   */
  async sendWorkoutReminder(to: string, userName: string): Promise<boolean> {
    const message = `💪 ${userName}, time to move! Log your workout in the Intentional app and keep your streak alive!`;
    return this.sendMessage(to, message);
  }

  /**
   * Send custom reminder
   */
  async sendCustomReminder(
    to: string,
    userName: string,
    reminderType: string,
    customMessage?: string,
  ): Promise<boolean> {
    const message = customMessage || `🌟 Hi ${userName}! Don't forget to log your ${reminderType} in the Intentional app!`;
    return this.sendMessage(to, message);
  }

  /**
   * Send streak reminder
   */
  async sendStreakReminder(to: string, userName: string, streakDays: number): Promise<boolean> {
    const message = `🔥 ${userName}, you're on a ${streakDays}-day streak! Don't break it now. Check in on the Intentional app!`;
    return this.sendMessage(to, message);
  }
}
