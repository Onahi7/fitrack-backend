import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DailyTaskDto {
  @IsString()
  @IsNotEmpty()
  taskType: string; // 'exercise', 'meal', 'fasting', 'sleep', 'water', 'custom'

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsString()
  @IsOptional()
  targetUnit?: string;

  @IsString()
  @IsOptional()
  exerciseType?: string;

  @IsString()
  @IsOptional()
  mealType?: string;

  @IsString()
  @IsOptional()
  fastingType?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  points?: number;

  @IsNumber()
  @IsOptional()
  dayOfChallenge?: number;
}

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'dynamic', 'water', 'meals', 'streak', 'custom'

  @IsNumber()
  goal: number;

  @IsNumber()
  duration: number; // in days

  @IsDateString()
  startDate: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPremiumChallenge?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresSubscription?: boolean;

  @IsString()
  @IsOptional()
  subscriptionTier?: string;

  @IsBoolean()
  @IsOptional()
  gift30Days?: boolean;

  @IsBoolean()
  @IsOptional()
  hasDynamicTasks?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyTaskDto)
  @IsOptional()
  dailyTasks?: DailyTaskDto[];
}
