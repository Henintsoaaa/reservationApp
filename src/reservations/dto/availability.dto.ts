import { IsDateString, IsString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsString()
  venueId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class GetAvailabilityDto {
  @IsString()
  venueId: string;

  @IsDateString()
  date: string;
}
