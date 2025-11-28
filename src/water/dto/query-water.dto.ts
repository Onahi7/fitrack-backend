import { IsOptional, IsDateString } from 'class-validator';

export class QueryWaterDto {
  @IsDateString()
  @IsOptional()
  date?: string;
}
