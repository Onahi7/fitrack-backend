import { IsNumber, IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @IsNumber()
  @IsOptional()
  startingWeight?: number;

  @IsNumber()
  @IsOptional()
  currentWeight?: number;

  @IsNumber()
  @IsOptional()
  goalWeight?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  dailyCalorieGoal?: number;

  @IsNumber()
  @IsOptional()
  dailyWaterGoal?: number;

  @IsBoolean()
  @IsOptional()
  tutorialCompleted?: boolean;

  @IsString()
  @IsOptional()
  fastingProtocol?: string;

  @IsDateString()
  @IsOptional()
  fastingStartTime?: string;
}
