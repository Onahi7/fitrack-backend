import { IsOptional, IsDateString } from 'class-validator';

export class QueryMealsDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
