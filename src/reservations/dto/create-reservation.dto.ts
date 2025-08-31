import {
  IsString,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class CreateReservationDto {
  @IsString()
  userId: string;

  @IsString()
  venueId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus = ReservationStatus.PENDING;

  @IsNumber()
  @Min(0)
  totalPrice?: number;
}
