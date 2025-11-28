import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  mood?: string;

  @IsBoolean()
  @IsOptional()
  encrypted?: boolean;

  @IsDateString()
  date: string;
}
