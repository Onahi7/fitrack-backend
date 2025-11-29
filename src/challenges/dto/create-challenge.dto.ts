import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'water', 'meals', 'streak', 'custom'

  @IsNumber()
  goal: number;

  @IsNumber()
  duration: number; // in days

  @IsDateString()
  startDate: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
