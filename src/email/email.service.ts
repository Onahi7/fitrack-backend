import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    console.log('🔑 Resend API Key configured:', apiKey ? 'Yes' : 'No');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('✅ Resend initialized successfully');
    } else {
      console.error('❌ RESEND_API_KEY not found in environment variables');
    }
  }

  async sendDailyCheckInReminder(email: string, name: string) {
    if (!this.resend) {
      console.error('❌ Resend not initialized, cannot send email');
      return null;
    }

    console.log('📧 Sending daily check-in reminder to:', email);

    console.log('📧 Sending daily check-in reminder to:', email);

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
          <div class=\"container\">
            <div class=\"header\">
              <h1>🌟 Daily Check-In Time!</h1>
            </div>
            <div class=\"content\">
              <p>Hi ${name}! 👋</p>
              <p>Time for your daily wellness check-in. Let's keep that streak going!</p>
              <ul>
                <li>🍽️ Log your meals</li>
                <li>💧 Track your water intake</li>
                <li>📝 Update your journal</li>
                <li>😊 Record your mood</li>
              </ul>
              <a href=\"${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}\" class=\"button\">
                Go to Intentional
              </a>
            </div>
            <div class=\"footer\">
              <p>You're doing great! Keep up the momentum.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.resend.emails.send({
        from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
        to: email,
        subject: '🌟 Daily Check-In Reminder - Intentional',
        html,
      });
      console.log('✅ Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
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
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
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
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
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
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `🏆 Achievement Unlocked: ${achievementName} - Intentional`,
      html,
    });
  }

  async sendNewChallengeNotification(
    email: string,
    name: string,
    challengeName: string,
    challengeDescription: string,
    challengeType: string,
    duration: number,
    imageUrl?: string,
  ) {
    if (!this.resend) return;

    const typeEmoji = this.getChallengeTypeEmoji(challengeType);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .challenge-card { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; }
            .challenge-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Challenge Available!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>An exciting new challenge has been created just for you!</p>
              <div class="challenge-card">
                ${imageUrl ? `<img src="${imageUrl}" alt="${challengeName}" class="challenge-image" />` : ''}
                <h2>${typeEmoji} ${challengeName}</h2>
                <p>${challengeDescription}</p>
                <p><strong>Duration:</strong> ${duration} days</p>
              </div>
              <p>Join now and start your journey to success!</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                View Challenge
              </a>
            </div>
            <div class="footer">
              <p>Challenge yourself and achieve greatness! 💪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `🎯 New Challenge: ${challengeName} - Intentional`,
      html,
    });
  }

  async sendChallengeJoinedNotification(
    email: string,
    name: string,
    challengeName: string,
    startDate: string,
    duration: number,
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
            .content { padding: 30px 20px; }
            .info-box { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're In!</h1>
            </div>
            <div class="content">
              <p>Congratulations, ${name}! 🎊</p>
              <p>You've successfully joined the <strong>${challengeName}</strong> challenge!</p>
              <div class="info-box">
                <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p><strong>Duration:</strong> ${duration} days</p>
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>✅ Complete daily tasks</li>
                  <li>📊 Track your progress</li>
                  <li>🏆 Earn achievements</li>
                  <li>👥 Connect with other participants</li>
                </ul>
              </div>
              <p>Get ready to crush your goals!</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                View My Challenges
              </a>
            </div>
            <div class="footer">
              <p>You've got this! We're cheering for you! 🌟</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `🎉 Welcome to ${challengeName} - Intentional`,
      html,
    });
  }

  async sendChallengeStartingSoonNotification(
    email: string,
    name: string,
    challengeName: string,
    startDate: string,
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
            .content { padding: 30px 20px; }
            .countdown { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; }
            .countdown h2 { color: #667eea; font-size: 48px; margin: 10px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Challenge Starts Tomorrow!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>Get ready! Your challenge <strong>${challengeName}</strong> starts tomorrow!</p>
              <div class="countdown">
                <h2>24</h2>
                <p>Hours to Go!</p>
              </div>
              <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p>Time to prepare:</p>
              <ul>
                <li>🎯 Review your goals</li>
                <li>📋 Check the daily tasks</li>
                <li>💪 Get mentally ready</li>
                <li>🌟 Stay motivated!</li>
              </ul>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                View Challenge Details
              </a>
            </div>
            <div class="footer">
              <p>Tomorrow is the start of something amazing! 🚀</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `⏰ ${challengeName} Starts Tomorrow - Intentional`,
      html,
    });
  }

  async sendDailyChallengeTaskReminder(
    email: string,
    name: string,
    challengeName: string,
    tasksCompleted: number,
    totalTasks: number,
  ) {
    if (!this.resend) return;

    const progress = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .progress-bar { background: #e0e0e0; border-radius: 12px; height: 30px; margin: 20px 0; overflow: hidden; }
            .progress-fill { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; border-radius: 12px; transition: width 0.3s; }
            .stats { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Daily Task Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>Don't forget to complete your daily tasks for <strong>${challengeName}</strong>!</p>
              <div class="stats">
                <p><strong>Today's Progress</strong></p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p style="text-align: center; font-size: 18px; font-weight: 600; color: #667eea;">
                  ${tasksCompleted} / ${totalTasks} tasks completed (${progress}%)
                </p>
              </div>
              ${tasksCompleted === totalTasks ? 
                '<p>🎉 Amazing! You\'ve completed all your tasks today!</p>' :
                '<p>Keep going! You\'re making great progress!</p>'
              }
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                Complete Tasks
              </a>
            </div>
            <div class="footer">
              <p>Every task completed is a step toward your goal! 💪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `📋 Daily Tasks for ${challengeName} - Intentional`,
      html,
    });
  }

  async sendChallengeCompletedNotification(
    email: string,
    name: string,
    challengeName: string,
    completionRate: number,
    rank?: number,
    totalParticipants?: number,
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
            .trophy { font-size: 80px; margin: 20px 0; }
            .stats { background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 20px 0; }
            .stat-item { margin: 15px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Challenge Completed!</h1>
            </div>
            <div class="content">
              <div class="trophy">🎉</div>
              <p>Congratulations, ${name}! 🎊</p>
              <p>You've successfully completed the <strong>${challengeName}</strong> challenge!</p>
              <div class="stats">
                <div class="stat-item">
                  <h2 style="color: #667eea; margin: 5px 0;">${completionRate}%</h2>
                  <p>Completion Rate</p>
                </div>
                ${rank && totalParticipants ? `
                  <div class="stat-item">
                    <h2 style="color: #667eea; margin: 5px 0;">#${rank}</h2>
                    <p>Your Rank (out of ${totalParticipants})</p>
                  </div>
                ` : ''}
              </div>
              <p>You've shown incredible dedication and commitment!</p>
              <p>Keep up the momentum with our other challenges!</p>
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                Browse More Challenges
              </a>
            </div>
            <div class="footer">
              <p>You're a champion! Keep crushing your goals! 🌟</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `🏆 You Completed ${challengeName}! - Intentional`,
      html,
    });
  }

  private getChallengeTypeEmoji(type: string): string {
    switch (type) {
      case 'water': return '💧';
      case 'meals': return '🍽️';
      case 'streak': return '🔥';
      case 'exercise': return '🏋️';
      case 'fasting': return '⏱️';
      default: return '🎯';
    }
  }

  async sendDailyTaskCreatedNotification(
    email: string,
    name: string,
    challengeName: string,
    taskTitle: string,
    taskDescription: string,
    taskType: string,
    points: number,
    taskDate: string,
  ) {
    if (!this.resend) return;

    const taskEmoji = this.getChallengeTypeEmoji(taskType);
    const formattedDate = new Date(taskDate).toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric' 
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { padding: 30px 20px; }
            .task-card { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #667eea; }
            .task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
            .task-title { font-size: 20px; font-weight: 600; color: #667eea; }
            .points-badge { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 5px 15px; border-radius: 20px; font-weight: 600; font-size: 14px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .date-info { background: #e8eaf6; padding: 10px 15px; border-radius: 8px; display: inline-block; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Daily Task Added!</h1>
            </div>
            <div class="content">
              <p>Hi ${name}! 👋</p>
              <p>A new task has been added to your <strong>${challengeName}</strong> challenge!</p>
              
              <div class="task-card">
                <div class="task-header">
                  <span style="font-size: 24px;">${taskEmoji}</span>
                  <span class="task-title">${taskTitle}</span>
                  <span class="points-badge">+${points} pts</span>
                </div>
                ${taskDescription ? `<p style="color: #666; margin-top: 10px;">${taskDescription}</p>` : ''}
                <div class="date-info">
                  📅 <strong>Due:</strong> ${formattedDate}
                </div>
              </div>

              <p>Complete this task to earn <strong>${points} points</strong> and stay on track with your challenge!</p>
              
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/challenges" class="button">
                View Task
              </a>
            </div>
            <div class="footer">
              <p>Keep up the great work! Every task brings you closer to your goals. 💪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.resend.emails.send({
      from: this.configService.get('FROM_EMAIL') || 'Intentional <noreply@fittrac.me>',
      to: email,
      subject: `${taskEmoji} New Task: ${taskTitle} - ${challengeName}`,
      html,
    });
  }

  // Batch send emails with rate limiting (2 emails per batch)
  async sendBatchEmails(
    emailPromises: Array<Promise<any>>,
    batchSize: number = 2,
  ): Promise<void> {
    for (let i = 0; i < emailPromises.length; i += batchSize) {
      const batch = emailPromises.slice(i, i + batchSize);
      await Promise.all(batch);
      // Wait 1 second between batches to respect rate limits
      if (i + batchSize < emailPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}
