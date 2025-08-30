import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string = 'user';

  @IsString()
  phone: string;

  @IsOptional()
  createdAt?: Date;

  @IsOptional()
  updatedAt?: Date;
}
