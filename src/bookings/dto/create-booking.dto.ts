import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum pour le statut du booking
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

// DTO pour les informations de contact
export class ContactInfoDto {
  @IsEmail({}, { message: 'Email doit être une adresse email valide' })
  @IsNotEmpty({ message: 'Email est requis' })
  email: string;

  @IsString({
    message: 'Le numéro de téléphone doit être une chaîne de caractères',
  })
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  phone: string;
}

// DTO principal pour créer un booking
export class CreateBookingDto {
  @IsString({ message: 'userId doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'userId est requis' })
  userId: string;

  @IsString({ message: 'eventId doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'eventId est requis' })
  eventId: string;

  @IsNumber({}, { message: 'numberOfTickets doit être un nombre' })
  @IsPositive({ message: 'Le nombre de tickets doit être positif' })
  numberOfTickets: number;

  @IsNumber({}, { message: 'totalPrice doit être un nombre' })
  @IsPositive({ message: 'Le prix total doit être positif' })
  totalPrice: number;

  @IsEnum(BookingStatus, {
    message: 'Le statut doit être pending, confirmed ou cancelled',
  })
  @IsOptional()
  status?: BookingStatus;

  @IsString({ message: 'bookingReference doit être une chaîne de caractères' })
  @IsOptional()
  bookingReference?: string;

  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;
}
