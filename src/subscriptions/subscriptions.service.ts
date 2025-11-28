import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { subscriptions, paymentTransactions, users } from '../database/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import axios from 'axios';
import { UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/admin-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  private readonly opayMerchantId = process.env.OPAY_MERCHANT_ID;
  private readonly opayPublicKey = process.env.OPAY_PUBLIC_KEY;
  private readonly opayPrivateKey = process.env.OPAY_PRIVATE_KEY;

  constructor(private drizzle: DrizzleService) {}

  async getUserSubscription(userId: string) {
    const [subscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      // Create free tier subscription for new users
      const [newSub] = await this.drizzle.db
        .insert(subscriptions)
        .values({
          userId,
          tier: 'free',
          status: 'active',
          amount: '0',
        })
        .returning();
      return newSub;
    }

    // Check if subscription has expired
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      await this.drizzle.db
        .update(subscriptions)
        .set({ 
          status: 'expired',
          tier: 'free',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
      
      subscription.status = 'expired';
      subscription.tier = 'free';
    }

    return subscription;
  }

  async initializePaystackPayment(userId: string, tier: 'premium' | 'pro', email: string) {
    const amount = tier === 'premium' ? 15000 : 45000;
    const reference = `SUB_${userId}_${Date.now()}`;

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amount * 100, // Paystack expects amount in kobo (₦1 = 100 kobo)
          reference,
          currency: 'NGN',
          metadata: {
            userId,
            tier,
            custom_fields: [
              {
                display_name: 'Subscription Tier',
                variable_name: 'subscription_tier',
                value: tier,
              },
            ],
          },
          callback_url: `${process.env.FRONTEND_URL}/subscription/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Save transaction record
      await this.drizzle.db.insert(paymentTransactions).values({
        userId,
        transactionReference: reference,
        paymentProvider: 'paystack',
        amount: String(amount),
        currency: 'NGN',
        status: 'pending',
        metadata: JSON.stringify({ tier }),
      });

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async initializeOpayPayment(userId: string, tier: 'premium' | 'pro', email: string) {
    const amount = tier === 'premium' ? 15000 : 45000;
    const reference = `OPAY_${userId}_${Date.now()}`;

    try {
      const response = await axios.post(
        'https://api.opayweb.com/api/v1/international/transaction/create',
        {
          merchantId: this.opayMerchantId,
          reference,
          amount: {
            total: amount * 100, // OPay expects amount in kobo
            currency: 'NGN',
          },
          callbackUrl: `${process.env.FRONTEND_URL}/subscription/callback`,
          returnUrl: `${process.env.FRONTEND_URL}/subscription/callback`,
          userInfo: {
            userEmail: email,
            userId,
          },
          product: {
            name: `FitTrack ${tier.charAt(0).toUpperCase() + tier.slice(1)} Subscription`,
            description: `Monthly ${tier} subscription`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.opayPublicKey}`,
            MerchantId: this.opayMerchantId,
            'Content-Type': 'application/json',
          },
        }
      );

      // Save transaction record
      await this.drizzle.db.insert(paymentTransactions).values({
        userId,
        transactionReference: reference,
        paymentProvider: 'opay',
        amount: String(amount),
        currency: 'NGN',
        status: 'pending',
        metadata: JSON.stringify({ tier }),
      });

      return {
        cashierUrl: response.data.data.cashierUrl,
        reference: response.data.data.reference,
      };
    } catch (error) {
      console.error('OPay initialization error:', error.response?.data || error);
      throw new BadRequestException('Failed to initialize OPay payment');
    }
  }

  async verifyPaystackPayment(reference: string) {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const { data } = response.data;
      
      if (data.status === 'success') {
        const { metadata } = data;
        const userId = metadata.userId;
        const tier = metadata.tier;
        const amount = data.amount / 100; // Convert from kobo to naira

        // Update transaction
        await this.drizzle.db
          .update(paymentTransactions)
          .set({
            status: 'success',
            paidAt: new Date(),
            providerResponse: JSON.stringify(data),
          })
          .where(eq(paymentTransactions.transactionReference, reference));

        // Create or update subscription
        await this.activateSubscription(userId, tier, amount, 'paystack', reference);

        return { success: true, tier };
      }

      return { success: false, message: 'Payment not successful' };
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  async verifyOpayPayment(reference: string) {
    try {
      const response = await axios.post(
        'https://api.opayweb.com/api/v1/international/transaction/status',
        {
          merchantId: this.opayMerchantId,
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.opayPublicKey}`,
            MerchantId: this.opayMerchantId,
          },
        }
      );

      const { data } = response.data;
      
      if (data.status === 'SUCCESS') {
        // Get transaction from DB to get userId and tier
        const [transaction] = await this.drizzle.db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.transactionReference, reference))
          .limit(1);

        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        const metadata = JSON.parse(transaction.metadata || '{}');
        const amount = parseFloat(transaction.amount);

        // Update transaction
        await this.drizzle.db
          .update(paymentTransactions)
          .set({
            status: 'success',
            paidAt: new Date(),
            providerResponse: JSON.stringify(data),
          })
          .where(eq(paymentTransactions.id, transaction.id));

        // Activate subscription
        await this.activateSubscription(
          transaction.userId,
          metadata.tier,
          amount,
          'opay',
          reference
        );

        return { success: true, tier: metadata.tier };
      }

      return { success: false, message: 'Payment not successful' };
    } catch (error) {
      console.error('OPay verification error:', error.response?.data || error);
      throw new BadRequestException('Failed to verify OPay payment');
    }
  }

  private async activateSubscription(
    userId: string,
    tier: 'premium' | 'pro',
    amount: number,
    provider: 'paystack' | 'opay',
    reference: string
  ) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    const [existingSubscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (existingSubscription) {
      // Update existing subscription
      await this.drizzle.db
        .update(subscriptions)
        .set({
          tier,
          status: 'active',
          amount: String(amount),
          paymentProvider: provider,
          subscriptionReference: reference,
          startDate,
          endDate,
          nextBillingDate: endDate,
          autoRenew: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubscription.id));
    } else {
      // Create new subscription
      await this.drizzle.db.insert(subscriptions).values({
        userId,
        tier,
        status: 'active',
        amount: String(amount),
        paymentProvider: provider,
        subscriptionReference: reference,
        startDate,
        endDate,
        nextBillingDate: endDate,
        autoRenew: true,
      });
    }
  }

  async cancelSubscription(userId: string) {
    const [subscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel at the end of current billing period
    await this.drizzle.db
      .update(subscriptions)
      .set({
        autoRenew: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return { success: true, message: 'Subscription will be cancelled at the end of billing period' };
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    const featureAccess = {
      'barcode-scanner': ['premium', 'pro'],
      'meal-planner': ['premium', 'pro'],
      'macro-tracking': ['premium', 'pro'],
      'fasting-timer': ['pro'],
      'advanced-analytics': ['pro'],
      'ai-coach': ['pro'],
    };

    const allowedTiers = featureAccess[feature] || [];
    return allowedTiers.includes(subscription.tier);
  }

  // ==================== ADMIN METHODS ====================

  async getAllSubscriptions(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    
    const results = await this.drizzle.db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        userName: users.displayName,
        tier: subscriptions.tier,
        status: subscriptions.status,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        paymentProvider: subscriptions.paymentProvider,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        nextBillingDate: subscriptions.nextBillingDate,
        autoRenew: subscriptions.autoRenew,
        cancelledAt: subscriptions.cancelledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  async getSubscriptionById(subscriptionId: number) {
    const [subscription] = await this.drizzle.db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        userName: users.displayName,
        tier: subscriptions.tier,
        status: subscriptions.status,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        paymentProvider: subscriptions.paymentProvider,
        subscriptionReference: subscriptions.subscriptionReference,
        customerCode: subscriptions.customerCode,
        subscriptionCode: subscriptions.subscriptionCode,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        nextBillingDate: subscriptions.nextBillingDate,
        autoRenew: subscriptions.autoRenew,
        cancelledAt: subscriptions.cancelledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    // Get associated transactions
    const transactions = await this.drizzle.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.subscriptionId, subscriptionId))
      .orderBy(desc(paymentTransactions.createdAt));

    return { ...subscription, transactions };
  }

  async adminUpdateSubscription(subscriptionId: number, updateDto: UpdateSubscriptionDto) {
    const [existingSubscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!existingSubscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    const updateData: any = {
      ...updateDto,
      updatedAt: new Date(),
    };

    // Convert amount to string if provided
    if (updateDto.amount !== undefined) {
      updateData.amount = String(updateDto.amount);
    }

    await this.drizzle.db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscriptionId));

    return this.getSubscriptionById(subscriptionId);
  }

  async adminCreateSubscription(createDto: CreateSubscriptionDto) {
    // Find user by email
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, createDto.userEmail))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with email ${createDto.userEmail} not found`);
    }

    // Check if subscription already exists
    const [existingSubscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (existingSubscription) {
      throw new BadRequestException(`User already has a subscription. Use update instead.`);
    }

    const startDate = createDto.startDate ? new Date(createDto.startDate) : new Date();
    const endDate = createDto.endDate ? new Date(createDto.endDate) : null;

    const [newSubscription] = await this.drizzle.db
      .insert(subscriptions)
      .values({
        userId: user.id,
        tier: createDto.tier,
        status: 'active',
        amount: String(createDto.amount || 0),
        paymentProvider: createDto.paymentProvider,
        startDate,
        endDate,
        nextBillingDate: endDate,
        autoRenew: createDto.autoRenew ?? true,
      })
      .returning();

    return this.getSubscriptionById(newSubscription.id);
  }

  async adminDeleteSubscription(subscriptionId: number) {
    const [existingSubscription] = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!existingSubscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    await this.drizzle.db
      .delete(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    return { success: true, message: 'Subscription deleted successfully' };
  }

  async getSubscriptionStats() {
    // Total subscriptions
    const [{ total }] = await this.drizzle.db
      .select({ total: sql<number>`count(*)` })
      .from(subscriptions);

    // Active subscriptions
    const [{ active }] = await this.drizzle.db
      .select({ active: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    // Cancelled subscriptions
    const [{ cancelled }] = await this.drizzle.db
      .select({ cancelled: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'cancelled'));

    // Expired subscriptions
    const [{ expired }] = await this.drizzle.db
      .select({ expired: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'expired'));

    // Premium count
    const [{ premium }] = await this.drizzle.db
      .select({ premium: sql<number>`count(*)` })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.tier, 'premium'),
        eq(subscriptions.status, 'active')
      ));

    // Pro count
    const [{ pro }] = await this.drizzle.db
      .select({ pro: sql<number>`count(*)` })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.tier, 'pro'),
        eq(subscriptions.status, 'active')
      ));

    // Free count
    const [{ free }] = await this.drizzle.db
      .select({ free: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.tier, 'free'));

    // Total revenue (all successful transactions)
    const [{ totalRevenue }] = await this.drizzle.db
      .select({ totalRevenue: sql<number>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.status, 'success'));

    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ monthlyRevenue }] = await this.drizzle.db
      .select({ monthlyRevenue: sql<number>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.status, 'success'),
        gte(paymentTransactions.createdAt, thirtyDaysAgo)
      ));

    return {
      totalSubscriptions: Number(total),
      activeSubscriptions: Number(active),
      cancelledSubscriptions: Number(cancelled),
      expiredSubscriptions: Number(expired),
      premiumCount: Number(premium),
      proCount: Number(pro),
      freeCount: Number(free),
      totalRevenue: Number(totalRevenue),
      monthlyRevenue: Number(monthlyRevenue),
    };
  }

  async getAllTransactions(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;

    const results = await this.drizzle.db
      .select({
        id: paymentTransactions.id,
        userId: paymentTransactions.userId,
        userEmail: users.email,
        userName: users.displayName,
        subscriptionId: paymentTransactions.subscriptionId,
        transactionReference: paymentTransactions.transactionReference,
        paymentProvider: paymentTransactions.paymentProvider,
        amount: paymentTransactions.amount,
        currency: paymentTransactions.currency,
        status: paymentTransactions.status,
        paymentMethod: paymentTransactions.paymentMethod,
        paidAt: paymentTransactions.paidAt,
        createdAt: paymentTransactions.createdAt,
      })
      .from(paymentTransactions)
      .leftJoin(users, eq(paymentTransactions.userId, users.id))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(paymentTransactions);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }
}

