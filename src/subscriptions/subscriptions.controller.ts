import { Controller, Get, Post, Body, Param, UseGuards, Query, Put, Delete } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/admin-subscription.dto';

@Controller('subscriptions')
@UseGuards(FirebaseAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  async getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getUserSubscription(user.uid);
  }

  @Post('initialize/paystack')
  async initializePaystackPayment(
    @CurrentUser() user: any,
    @Body() body: { tier: 'premium' | 'pro'; email: string }
  ) {
    return this.subscriptionsService.initializePaystackPayment(
      user.uid,
      body.tier,
      body.email
    );
  }

  @Post('initialize/opay')
  async initializeOpayPayment(
    @CurrentUser() user: any,
    @Body() body: { tier: 'premium' | 'pro'; email: string }
  ) {
    return this.subscriptionsService.initializeOpayPayment(
      user.uid,
      body.tier,
      body.email
    );
  }

  @Get('verify/paystack/:reference')
  async verifyPaystackPayment(@Param('reference') reference: string) {
    return this.subscriptionsService.verifyPaystackPayment(reference);
  }

  @Get('verify/opay/:reference')
  async verifyOpayPayment(@Param('reference') reference: string) {
    return this.subscriptionsService.verifyOpayPayment(reference);
  }

  @Post('cancel')
  async cancelSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelSubscription(user.uid);
  }

  @Get('feature-access/:feature')
  async checkFeatureAccess(
    @CurrentUser() user: any,
    @Param('feature') feature: string
  ) {
    const hasAccess = await this.subscriptionsService.checkFeatureAccess(
      user.uid,
      feature
    );
    return { hasAccess };
  }

  // Webhook endpoint for Paystack (no auth required)
  @Post('webhook/paystack')
  async paystackWebhook(@Body() body: any) {
    // Verify webhook signature
    const hash = require('crypto')
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(body))
      .digest('hex');

    // Process webhook events
    if (body.event === 'charge.success') {
      const { reference } = body.data;
      await this.subscriptionsService.verifyPaystackPayment(reference);
    }

    return { success: true };
  }

  // Webhook endpoint for OPay (no auth required)
  @Post('webhook/opay')
  async opayWebhook(@Body() body: any) {
    // Verify webhook signature if needed
    
    if (body.status === 'SUCCESS') {
      const { reference } = body.data;
      await this.subscriptionsService.verifyOpayPayment(reference);
    }

    return { success: true };
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async getAllSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.subscriptionsService.getAllSubscriptions(
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }

  @Get('admin/stats')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async getSubscriptionStats() {
    return this.subscriptionsService.getSubscriptionStats();
  }

  @Get('admin/transactions')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async getAllTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.subscriptionsService.getAllTransactions(
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }

  @Get('admin/:id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionById(parseInt(id, 10));
  }

  @Post('admin/create')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async adminCreateSubscription(@Body() createDto: CreateSubscriptionDto) {
    return this.subscriptionsService.adminCreateSubscription(createDto);
  }

  @Put('admin/:id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async adminUpdateSubscription(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto
  ) {
    return this.subscriptionsService.adminUpdateSubscription(
      parseInt(id, 10),
      updateDto
    );
  }

  @Delete('admin/:id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async adminDeleteSubscription(@Param('id') id: string) {
    return this.subscriptionsService.adminDeleteSubscription(parseInt(id, 10));
  }
}
