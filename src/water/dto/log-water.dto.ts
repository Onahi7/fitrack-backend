import { IsNumber, IsDateString } from 'class-validator';

export class LogWaterDto {
  @IsNumber()
  glasses: number;

  @IsDateString()
  date: string;
}
