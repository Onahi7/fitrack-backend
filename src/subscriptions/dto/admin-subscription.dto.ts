import { IsEmail, IsEnum, IsOptional, IsNumber, IsBoolean, IsString, IsDateString } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(['free', 'premium', 'pro'])
  tier?: 'free' | 'premium' | 'pro';

  @IsOptional()
  @IsEnum(['active', 'cancelled', 'expired', 'past_due'])
  status?: 'active' | 'cancelled' | 'expired' | 'past_due';

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(['paystack', 'opay'])
  paymentProvider?: 'paystack' | 'opay';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  nextBillingDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class CreateSubscriptionDto {
  @IsEmail()
  userEmail: string;

  @IsEnum(['free', 'premium', 'pro'])
  tier: 'free' | 'premium' | 'pro';

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(['paystack', 'opay'])
  paymentProvider?: 'paystack' | 'opay';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class SubscriptionStatsDto {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  premiumCount: number;
  proCount: number;
  freeCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
}
