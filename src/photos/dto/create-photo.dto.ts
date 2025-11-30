import { IsString, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';

export class CreatePhotoDto {
  @IsString()
  url: string;

  @IsString()
  cloudinaryPublicId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsIn(['private', 'buddy', 'community'])
  visibility?: 'private' | 'buddy' | 'community';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  bodyFat?: number;
}