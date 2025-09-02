import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsPositive,
  IsOptional,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VenueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['concert', 'conference', 'festival', 'theatre', 'other'])
  category: string;

  @IsDateString()
  date: string;

  @IsInt()
  @IsPositive()
  duration: number;

  @ValidateNested()
  @Type(() => VenueDto)
  venue: VenueDto;

  @IsInt()
  @IsPositive()
  totalSeats: number;

  @IsInt()
  @IsPositive()
  availableSeats: number;

  @IsInt()
  @IsPositive()
  ticketPrice: number;

  @IsString()
  @IsNotEmpty()
  organizer: string;

  @IsString()
  @IsIn(['active', 'cancelled', 'completed'])
  status: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
