import { pgTable, serial, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  tier: text('tier', { enum: ['free', 'premium', 'pro'] }).notNull().default('free'),
  status: text('status', { enum: ['active', 'cancelled', 'expired', 'past_due'] }).notNull().default('active'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('NGN'),
  paymentProvider: text('payment_provider', { enum: ['paystack', 'opay'] }),
  subscriptionReference: text('subscription_reference'),
  customerCode: text('customer_code'),
  subscriptionCode: text('subscription_code'),
  emailToken: text('email_token'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  nextBillingDate: timestamp('next_billing_date'),
  autoRenew: boolean('auto_renew').default(true),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: serial('subscription_id').references(() => subscriptions.id),
  transactionReference: text('transaction_reference').notNull().unique(),
  paymentProvider: text('payment_provider', { enum: ['paystack', 'opay'] }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('NGN'),
  status: text('status', { enum: ['pending', 'success', 'failed', 'abandoned'] }).notNull(),
  paymentMethod: text('payment_method'),
  providerResponse: text('provider_response'),
  metadata: text('metadata'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
