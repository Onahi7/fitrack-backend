import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBuddyRequestDto {
  @IsString()
  targetUserId: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @IsOptional()
  sharedGoals?: string[];
}
