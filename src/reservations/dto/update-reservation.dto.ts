import {
  IsString,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ReservationStatus } from './create-reservation.dto';

export class UpdateReservationDto {
  @IsString()
  @IsOptional()
  venueId?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPrice?: number;
}
