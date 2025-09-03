import { Inject, Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ObjectId } from 'mongodb';
import { Redis } from 'ioredis';

@Injectable()
export class BookingsService {
  constructor(
    @Inject('MONGO') private db: any,
    @Inject('REDIS') private redis: Redis,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    currentUser: { userId: string },
  ) {
    const { eventId, numberOfTickets, userId } = createBookingDto;

    if (!currentUser || !currentUser.userId) {
      throw new Error('Utilisateur non authentifié');
    }

    await this.checkRateLimit(currentUser.userId);

    const lockKey = `booking_lock:${eventId}:${currentUser.userId}`;
    const lockAcquired = await this.redis.set(
      lockKey,
      Date.now(),
      'EX',
      300,
      'NX',
    );

    if (!lockAcquired) {
      throw new Error('Une réservation est déjà en cours pour cet événement');
    }

    try {
      const event = await this.getEventWithCache(eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }

      const seatsKey = `event:${eventId}:available_seats`;
      let availableSeats = await this.redis.get(seatsKey);

      if (availableSeats === null) {
        availableSeats = event.availableSeats?.toString() || '0';
        await this.redis.setex(seatsKey, 3600, availableSeats ?? '0');
      }

      const remainingSeats = await this.redis.decrby(seatsKey, numberOfTickets);

      if (remainingSeats < 0) {
        await this.redis.incrby(seatsKey, numberOfTickets);
        throw new Error('Pas assez de places disponibles');
      }

      const tempBookingId = `temp_booking:${currentUser.userId}:${Date.now()}`;
      const tempBookingData = {
        ...createBookingDto,
        userId: currentUser.userId,
        bookingReference: `BK${Date.now()}`,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      await this.redis.setex(
        tempBookingId,
        1800,
        JSON.stringify(tempBookingData),
      );

      const result = await this.db.collection('bookings').insertOne({
        ...tempBookingData,
        _id: new ObjectId(),
      });

      if (result.insertedId) {
        await this.redis.del(tempBookingId);

        await this.redis.del(`user:${currentUser.userId}:bookings`);

        await this.updateEventStats(
          eventId,
          numberOfTickets,
          tempBookingData.totalPrice,
        );

        await this.redis.publish(
          `event_updates:${eventId}`,
          JSON.stringify({ type: 'seats_updated', available: remainingSeats }),
        );

        return {
          success: true,
          bookingId: result.insertedId,
          bookingReference: tempBookingData.bookingReference,
          availableSeats: remainingSeats,
        };
      } else {
        await this.redis.incrby(seatsKey, numberOfTickets);
        throw new Error('Erreur lors de la création de la réservation');
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async findAll() {
    const cacheKey = 'all_bookings';

    const cachedBookings = await this.redis.get(cacheKey);
    if (cachedBookings) {
      return JSON.parse(cachedBookings);
    }

    const bookings = await this.db.collection('bookings').find().toArray();

    await this.redis.setex(cacheKey, 600, JSON.stringify(bookings));

    return bookings;
  }

  async findByUserId(userId: string) {
    const cacheKey = `user:${userId}:bookings`;

    const cachedBookings = await this.redis.get(cacheKey);
    if (cachedBookings) {
      return JSON.parse(cachedBookings);
    }

    const bookings = await this.db
      .collection('bookings')
      .find({ userId })
      .toArray();

    await this.redis.setex(cacheKey, 3600, JSON.stringify(bookings));

    return bookings;
  }

  async findOne(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new Error('ID de réservation invalide');
    }

    const cacheKey = `booking:${id}`;

    const cachedBooking = await this.redis.get(cacheKey);
    if (cachedBooking) {
      return JSON.parse(cachedBooking);
    }

    const booking = await this.db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    await this.redis.setex(cacheKey, 3600, JSON.stringify(booking));

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

    const booking = await this.findOne(id);
    if (booking.userId !== currentUser.userId) {
      throw new Error('Seul le créateur de la réservation peut la modifier');
    }

    const result = await this.db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateBookingDto,
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      await Promise.all([
        this.redis.del(`booking:${id}`),
        this.redis.del(`user:${currentUser.userId}:bookings`),
        this.redis.del('all_bookings'),
      ]);
    }

    return result;
  }

  async remove(id: string, currentUser: { userId: string }) {
    if (!ObjectId.isValid(id)) {
      throw new Error('ID de réservation invalide');
    }

    const booking = await this.findOne(id);

    if (booking.userId !== currentUser.userId) {
      throw new Error(
        'Seul le créateur de la réservation peut supprimer la réservation',
      );
    }

    const seatsKey = `event:${booking.eventId}:available_seats`;
    await this.redis.incrby(seatsKey, booking.numberOfTickets);

    const result = await this.db
      .collection('bookings')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0) {
      await Promise.all([
        this.redis.del(`booking:${id}`),
        this.redis.del(`user:${currentUser.userId}:bookings`),
        this.redis.del('all_bookings'),
      ]);

      const availableSeats = await this.redis.get(seatsKey);
      await this.redis.publish(
        `event_updates:${booking.eventId}`,
        JSON.stringify({
          type: 'seats_updated',
          available: parseInt(availableSeats || '0'),
        }),
      );
    }

    return result;
  }
  private async checkRateLimit(userId: string): Promise<void> {
    const rateLimitKey = `rate_limit:booking:${userId}`;
    const current = await this.redis.incr(rateLimitKey);

    if (current === 1) {
      await this.redis.expire(rateLimitKey, 3600);
    }

    if (current > 10) {
      throw new Error(
        'Trop de tentatives de réservation. Réessayez dans 1 heure.',
      );
    }
  }

  private async getEventWithCache(eventId: string): Promise<any> {
    const cacheKey = `event:${eventId}`;

    const cachedEvent = await this.redis.get(cacheKey);
    if (cachedEvent) {
      return JSON.parse(cachedEvent);
    }

    const event = await this.db
      .collection('events')
      .findOne({ _id: new ObjectId(eventId) });

    if (event) {
      await this.redis.setex(cacheKey, 86400, JSON.stringify(event));
    }

    return event;
  }

  private async updateEventStats(
    eventId: string,
    numberOfTickets: number,
    totalPrice: number,
  ): Promise<void> {
    const statsKey = `stats:event:${eventId}`;

    await Promise.all([
      this.redis.hincrby(statsKey, 'total_bookings', 1),
      this.redis.hincrby(statsKey, 'total_tickets', numberOfTickets),
      this.redis.hincrby(statsKey, 'total_revenue', totalPrice),
      this.redis.hset(statsKey, 'last_booking_time', Date.now()),
    ]);
    await this.redis.expire(statsKey, 86400);
  }

  async getEventStats(eventId: string) {
    const statsKey = `stats:event:${eventId}`;
    const stats = await this.redis.hgetall(statsKey);

    return {
      totalBookings: parseInt(stats.total_bookings || '0'),
      totalTickets: parseInt(stats.total_tickets || '0'),
      totalRevenue: parseInt(stats.total_revenue || '0'),
      lastBookingTime: stats.last_booking_time
        ? new Date(parseInt(stats.last_booking_time))
        : null,
    };
  }

  async getAvailableSeats(eventId: string): Promise<number> {
    const seatsKey = `event:${eventId}:available_seats`;
    const availableSeats = await this.redis.get(seatsKey);

    if (availableSeats === null) {
      const event = await this.getEventWithCache(eventId);
      const seats = event?.availableSeats || 0;
      await this.redis.setex(seatsKey, 3600, seats.toString());
      return seats;
    }

    return parseInt(availableSeats);
  }
}
