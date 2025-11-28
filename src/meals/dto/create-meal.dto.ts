import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateMealDto {
  @IsString()
  name: string;

  @IsNumber()
  calories: number;

  @IsNumber()
  @IsOptional()
  protein?: number;

  @IsNumber()
  @IsOptional()
  carbs?: number;

  @IsNumber()
  @IsOptional()
  fats?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;

  @IsString()
  mealType: string; // 'breakfast' | 'lunch' | 'dinner' | 'snack'

  @IsDateString()
  date: string;
}
