import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;
}

export class CreateVenuesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsNumber()
  capacity: number;

  @IsNumber()
  pricePerHour: number;
}
