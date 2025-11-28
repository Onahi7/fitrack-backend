import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  category: string; // 'streak' | 'weight' | 'consistency' | 'community' | 'special'

  @IsString()
  icon: string;

  @IsInt()
  requirement: number;
}

export class UpdateProgressDto {
  @IsInt()
  progress: number;
}
