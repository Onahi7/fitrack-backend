import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  id: string; // Firebase UID

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  photoURL?: string;
}
