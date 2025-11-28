import { IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  type: string; // 'meal' | 'water' | 'journal' | 'overall'
}
