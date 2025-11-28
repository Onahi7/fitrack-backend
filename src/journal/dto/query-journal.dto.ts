import { IsOptional, IsDateString } from 'class-validator';

export class QueryJournalDto {
  @IsDateString()
  @IsOptional()
  date?: string;
}
