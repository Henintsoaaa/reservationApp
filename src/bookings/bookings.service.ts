import { Inject, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ObjectId } from 'mongodb';

@Injectable()
export class BookingsService {
  constructor(@Inject('MONGO') private db: any) {}

  create(createBookingDto: CreateBookingDto) {
    const availableEvent = this.db
      .collection('events')
      .findOne({ id: createBookingDto.eventId });

    if (!CurrentUser) {
      throw new Error('Utilisateur non trouvé');
    }

    if (!availableEvent) {
      throw new Error('Événement non trouvé');
    }

    return this.db.collection('bookings').insertOne(createBookingDto);
  }

  async findAll() {
    const bookings = await this.db.collection('bookings').find().toArray();
    return bookings;
  }

  async findByUserId(userId: string) {
    const bookings = await this.db
      .collection('bookings')
      .find({ userId })
      .toArray();
    return bookings;
  }

  async findOne(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new Error('ID de réservation invalide');
    }
    const booking = await this.db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });
    if (!booking) {
      throw new Error('Réservation non trouvée');
    }
    return booking;
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
    currentUser: { userId: string },
  ) {
    if (!ObjectId.isValid(id)) {
      throw new Error('ID de réservation invalide');
    }
    const booking = await this.db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });
    if (!booking) {
      throw new Error('Réservation non trouvée');
    }
    if (booking.userId !== currentUser.userId) {
      throw new Error('Seul le créateur de la réservation peut la modifier');
    }
    return this.db
      .collection('bookings')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateBookingDto });
  }

  async remove(
    id: string,
    updateBookingDto: UpdateBookingDto,
    currentUser: { userId: string },
  ) {
    if (!ObjectId.isValid(id)) {
      throw new Error('ID de réservation invalide');
    }
    const booking = await this.db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });
    if (!booking) {
      throw new Error('Réservation non trouvée');
    }
    if (booking.userId !== currentUser.userId) {
      throw new Error('Seul le créateur de la réservation peut la modifier');
    }
    return this.db.collection('bookings').deleteOne({ _id: new ObjectId(id) });
  }
}
