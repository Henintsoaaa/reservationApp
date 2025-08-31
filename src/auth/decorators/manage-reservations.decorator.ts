import { SetMetadata } from '@nestjs/common';

export const MANAGE_RESERVATIONS_KEY = 'manageReservations';
export const ManageReservations = () =>
  SetMetadata(MANAGE_RESERVATIONS_KEY, true);
