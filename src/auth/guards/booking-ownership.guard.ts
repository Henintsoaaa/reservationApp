import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ObjectId } from 'mongodb';

@Injectable()
export class BookingOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('MONGO') private db: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const bookingId = request.params.id;
    const method = request.method;

    // Les admins peuvent accéder à toutes les réservations
    if (user?.role === 'admin') {
      return true;
    }

    // Pour les autres actions qui nécessitent un ID de réservation
    if (bookingId) {
      if (!ObjectId.isValid(bookingId)) {
        throw new ForbiddenException('ID de réservation invalide');
      }

      const booking = await this.db
        .collection('bookings')
        .findOne({ _id: new ObjectId(bookingId) });

      if (!booking) {
        throw new ForbiddenException('Réservation non trouvée');
      }

      // Vérifier si l'utilisateur est le propriétaire de la réservation
      if (booking.userId !== user.id) {
        // Messages spécifiques selon l'opération
        if (method === 'PATCH' || method === 'PUT') {
          throw new ForbiddenException(
            'Vous ne pouvez modifier que vos propres réservations',
          );
        } else if (method === 'DELETE') {
          throw new ForbiddenException(
            'Vous ne pouvez supprimer que vos propres réservations',
          );
        } else {
          throw new ForbiddenException(
            "Vous ne pouvez accéder qu'à vos propres réservations",
          );
        }
      }
    }

    return true;
  }
}
