import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendDailyCheckInReminder(email: string, name: string) {
    if (!this.resend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            ul { list-style: none; padding: 0; }
            li { padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 Daily Check-In Time!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>Time for your daily wellness check-in. Let's keep that streak going!</p>
              <ul>
                <li>🍽️ Log your meals</li>
                <li>💧 Track your water intake</li>
                <li>📝 Update your journal</li>
                <li>😊 Record your mood</li>
              </ul>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}" class="button">
                Go to Intentional
              </a>
            </div>
            <div class="footer">
              <p>You're doing great! Keep up the momentum.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: 'Intentional <onboarding@resend.dev>',
      to: email,
      subject: '🌟 Daily Check-In Reminder - Intentional',
      html,
    });
  }

  async sendWeeklyCheckInReminder(email: string, name: string) {
    if (!this.resend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            ul { list-style: none; padding: 0; }
            li { padding: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Check-In Time!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>It's time for your weekly wellness check-in. Let's review your progress!</p>
              <ul>
                <li>⚖️ Log your weekly weigh-in</li>
                <li>📈 Review your progress</li>
                <li>🎯 Set goals for next week</li>
                <li>🏆 Celebrate your wins!</li>
              </ul>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/progress" class="button">
                Complete Weekly Check-In
              </a>
            </div>
            <div class="footer">
              <p>Every week is a fresh start. You've got this! 💪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: 'Intentional <onboarding@resend.dev>',
      to: email,
      subject: '📊 Weekly Check-In Reminder - Intentional',
      html,
    });
  }

  async sendMealReminder(email: string, name: string, mealType: string) {
    if (!this.resend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Don't Forget Your ${mealType}!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>Quick reminder to log your ${mealType.toLowerCase()} to keep your nutrition tracking on point.</p>
              <p>📸 Take a quick photo and let our AI estimate the calories!</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/meals" class="button">
                Log ${mealType}
              </a>
            </div>
            <div class="footer">
              <p>Stay consistent, stay healthy! 🌱</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: 'Intentional <onboarding@resend.dev>',
      to: email,
      subject: `🍽️ ${mealType} Reminder - Intentional`,
      html,
    });
  }

  async sendAchievementUnlocked(
    email: string,
    name: string,
    achievementName: string,
    achievementDescription: string,
  ) {
    if (!this.resend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; text-align: center; }
            .achievement { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Achievement Unlocked!</h1>
            </div>
            <div class="content">
              <p>Congratulations, ${name}! 🎉</p>
              <div class="achievement">
                <h2>${achievementName}</h2>
                <p>${achievementDescription}</p>
              </div>
              <p>You're crushing your wellness goals! Keep up the amazing work!</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/profile" class="button">
                View All Achievements
              </a>
            </div>
            <div class="footer">
              <p>Every achievement is a step closer to your goals! 🌟</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: 'Intentional <onboarding@resend.dev>',
      to: email,
      subject: `🏆 Achievement Unlocked: ${achievementName} - Intentional`,
      html,
    });
  }
}
