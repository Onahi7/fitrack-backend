import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class UpdateBuddyDto {
  @IsEnum(['pending', 'active', 'inactive'])
  @IsOptional()
  status?: 'pending' | 'active' | 'inactive';

  @IsArray()
  @IsOptional()
  sharedGoals?: string[];

  @IsOptional()
  privacySettings?: any;
}
