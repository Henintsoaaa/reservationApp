import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Db, ObjectId } from 'mongodb';
import {
  CreateReservationDto,
  ReservationStatus,
} from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationMetricsService } from './metrics.service';

@Injectable()
export class ReservationsService {
  constructor(
    @Inject('MONGO') private db: Db,
    @Inject('REDIS') private redis: any,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly metricsService: ReservationMetricsService,
  ) {}

  private readonly CACHE_KEYS = {
    ALL_RESERVATIONS: 'reservations:all',
    USER_RESERVATIONS: (userId: string) => `reservations:user:${userId}`,
    RESERVATION: (id: string) => `reservation:${id}`,
    VENUE_AVAILABILITY: (venueId: string, date: string) =>
      `availability:${venueId}:${date}`,
    VENUE_LOCK: (venueId: string) => `lock:venue:${venueId}`,
  };

  private readonly CACHE_TTL = {
    RESERVATIONS: 300,
    AVAILABILITY: 600,
    LOCK_TIMEOUT: 30,
  };

  private async acquireLock(
    lockKey: string,
    timeout: number = this.CACHE_TTL.LOCK_TIMEOUT,
  ): Promise<boolean> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const result = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      timeout * 1000,
      'NX',
    );
    return result === 'OK';
  }

  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  private async invalidateReservationCache(
    reservationId?: string,
    userId?: string,
    venueId?: string,
  ): Promise<void> {
    const keysToDelete = [this.CACHE_KEYS.ALL_RESERVATIONS];

    if (reservationId) {
      keysToDelete.push(this.CACHE_KEYS.RESERVATION(reservationId));
    }

    if (userId) {
      keysToDelete.push(this.CACHE_KEYS.USER_RESERVATIONS(userId));
    }

    if (venueId) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      keysToDelete.push(
        this.CACHE_KEYS.VENUE_AVAILABILITY(venueId, today),
        this.CACHE_KEYS.VENUE_AVAILABILITY(venueId, tomorrow),
      );
    }

    await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));
  }

  async findAll(): Promise<any[]> {
    const cachedData = await this.cacheManager.get(
      this.CACHE_KEYS.ALL_RESERVATIONS,
    );
    if (cachedData) {
      return cachedData as any[];
    }

    const reservations = await this.db.collection('bookings').find().toArray();

    const populatedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const [user, venue] = await Promise.all([
          this.db
            .collection('users')
            .findOne({ _id: new ObjectId(reservation.userId) }),
          this.db
            .collection('venues')
            .findOne({ _id: new ObjectId(reservation.venueId) }),
        ]);

        return {
          ...reservation,
          id: reservation._id.toString(),
          user: user
            ? {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
              }
            : null,
          venue: venue
            ? {
                id: venue._id.toString(),
                name: venue.name,
                description: venue.description,
                location: venue.location,
                capacity: venue.capacity,
                pricePerHour: venue.pricePerHour,
                createdAt: venue.createdAt,
                updatedAt: venue.updatedAt,
              }
            : null,
        };
      }),
    );

    await this.cacheManager.set(
      this.CACHE_KEYS.ALL_RESERVATIONS,
      populatedReservations,
      this.CACHE_TTL.RESERVATIONS,
    );

    return populatedReservations;
  }

  async findByUserId(userId: string): Promise<any[]> {
    const cacheKey = this.CACHE_KEYS.USER_RESERVATIONS(userId);
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData as any[];
    }

    const reservations = await this.db
      .collection('bookings')
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    const populatedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        const venue = await this.db
          .collection('venues')
          .findOne({ _id: new ObjectId(reservation.venueId) });

        return {
          ...reservation,
          id: reservation._id.toString(),
          venue: venue
            ? {
                id: venue._id.toString(),
                name: venue.name,
                description: venue.description,
                location: venue.location,
                capacity: venue.capacity,
                pricePerHour: venue.pricePerHour,
                createdAt: venue.createdAt,
                updatedAt: venue.updatedAt,
              }
            : null,
        };
      }),
    );

    await this.cacheManager.set(
      cacheKey,
      populatedReservations,
      this.CACHE_TTL.RESERVATIONS,
    );

    return populatedReservations;
  }

  async findOne(id: string): Promise<any> {
    const cacheKey = this.CACHE_KEYS.RESERVATION(id);
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const reservation = await this.db
      .collection('bookings')
      .findOne({ _id: new ObjectId(id) });

    if (!reservation) {
      return null;
    }

    const [user, venue] = await Promise.all([
      this.db
        .collection('users')
        .findOne({ _id: new ObjectId(reservation.userId) }),
      this.db
        .collection('venues')
        .findOne({ _id: new ObjectId(reservation.venueId) }),
    ]);

    const populatedReservation = {
      ...reservation,
      id: reservation._id.toString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
          }
        : null,
      venue: venue
        ? {
            id: venue._id.toString(),
            name: venue.name,
            description: venue.description,
            location: venue.location,
            capacity: venue.capacity,
            pricePerHour: venue.pricePerHour,
            createdAt: venue.createdAt,
            updatedAt: venue.updatedAt,
          }
        : null,
    };

    await this.cacheManager.set(
      cacheKey,
      populatedReservation,
      this.CACHE_TTL.RESERVATIONS,
    );

    return populatedReservation;
  }

  async findOneWithOwnershipCheck(id: string, user: any): Promise<any> {
    const reservation = await this.findOne(id);

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (user.role !== 'admin' && reservation.userId !== user.id) {
      throw new ForbiddenException('You can only view your own reservations');
    }

    return reservation;
  }

  async create(data: CreateReservationDto, userId: string): Promise<any> {
    const operationStartTime = Date.now();
    const lockKey = this.CACHE_KEYS.VENUE_LOCK(data.venueId);
    let lockAcquired = false;
    let success = true;

    try {
      lockAcquired = await this.acquireLock(lockKey);
      if (!lockAcquired) {
        await this.metricsService.recordConcurrencyEvent(
          data.venueId,
          'lock_failed',
        );
        throw new ConflictException(
          'Another reservation is being processed for this venue. Please try again in a moment.',
        );
      }

      await this.metricsService.recordConcurrencyEvent(
        data.venueId,
        'lock_acquired',
      );

      const venue = await this.db
        .collection('venues')
        .findOne({ _id: new ObjectId(data.venueId) });

      if (!venue) {
        throw new NotFoundException(`Venue with ID ${data.venueId} not found`);
      }

      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      if (startTime < new Date()) {
        throw new BadRequestException('Cannot book a venue in the past');
      }

      const isAvailable = await this.checkAvailability(
        data.venueId,
        startTime,
        endTime,
      );
      if (!isAvailable) {
        await this.metricsService.recordConcurrencyEvent(
          data.venueId,
          'conflict_detected',
        );
        throw new BadRequestException(
          'Venue is not available during the requested time period',
        );
      }

      const durationHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const calculatedPrice = Math.ceil(durationHours) * venue.pricePerHour;

      const reservationData = {
        userId: userId,
        venueId: data.venueId,
        startTime,
        endTime,
        totalPrice: calculatedPrice,
        status: data.status || ReservationStatus.PENDING,
        createdAt: new Date(),
      };

      const result = await this.db
        .collection('bookings')
        .insertOne(reservationData);

      const createdReservation = await this.db
        .collection('bookings')
        .findOne({ _id: result.insertedId });

      if (createdReservation) {
        const reservation = {
          ...createdReservation,
          id: createdReservation._id.toString(),
        };

        await this.invalidateReservationCache(
          reservation.id,
          userId,
          data.venueId,
        );

        return reservation;
      }
      return createdReservation;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey);
      }

      const duration = Date.now() - operationStartTime;
      await this.metricsService.recordPerformanceMetric(
        'create_reservation',
        duration,
        success,
      );
    }
  }

  async checkAvailability(
    venueId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string,
  ): Promise<boolean> {
    const query: any = {
      venueId: venueId,
      status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
      $or: [
        {
          startTime: { $lte: startTime },
          endTime: { $gt: startTime },
        },
        {
          startTime: { $lt: endTime },
          endTime: { $gte: endTime },
        },
        {
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
      ],
    };

    if (excludeReservationId) {
      query._id = { $ne: new ObjectId(excludeReservationId) };
    }

    const conflictingReservation = await this.db
      .collection('bookings')
      .findOne(query);

    return !conflictingReservation;
  }

  async getVenueAvailability(venueId: string, date: string): Promise<any> {
    const cacheKey = this.CACHE_KEYS.VENUE_AVAILABILITY(venueId, date);
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const venue = await this.db
      .collection('venues')
      .findOne({ _id: new ObjectId(venueId) });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.db
      .collection('bookings')
      .find({
        venueId: venueId,
        status: {
          $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
        $or: [
          {
            startTime: { $gte: startOfDay, $lte: endOfDay },
          },
          {
            endTime: { $gte: startOfDay, $lte: endOfDay },
          },
          {
            startTime: { $lte: startOfDay },
            endTime: { $gte: endOfDay },
          },
        ],
      })
      .sort({ startTime: 1 })
      .toArray();

    const availability = {
      venue: {
        id: venue._id,
        name: venue.name,
        pricePerHour: venue.pricePerHour,
      },
      date: date,
      reservations: reservations.map((r) => ({
        id: r._id,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
      })),
    };

    await this.cacheManager.set(
      cacheKey,
      availability,
      this.CACHE_TTL.AVAILABILITY,
    );

    return availability;
  }

  async update(
    id: string,
    data: UpdateReservationDto,
    user: any,
  ): Promise<any> {
    const existingReservation = await this.findOne(id);
    if (!existingReservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (user.role !== 'admin' && existingReservation.userId !== user.id) {
      throw new ForbiddenException('You can only update your own reservations');
    }

    let lockKey: string | null = null;
    let lockAcquired = false;

    try {
      if (data.startTime || data.endTime || data.venueId) {
        const venueId = data.venueId || existingReservation.venueId;
        lockKey = this.CACHE_KEYS.VENUE_LOCK(venueId);

        lockAcquired = await this.acquireLock(lockKey);
        if (!lockAcquired) {
          throw new ConflictException(
            'Another reservation is being processed for this venue. Please try again in a moment.',
          );
        }

        const startTime = data.startTime
          ? new Date(data.startTime)
          : existingReservation.startTime;
        const endTime = data.endTime
          ? new Date(data.endTime)
          : existingReservation.endTime;

        if (startTime >= endTime) {
          throw new BadRequestException('Start time must be before end time');
        }

        const isAvailable = await this.checkAvailability(
          venueId,
          startTime,
          endTime,
          id,
        );
        if (!isAvailable) {
          throw new BadRequestException(
            'Venue is not available during the requested time period',
          );
        }

        if (data.venueId || data.startTime || data.endTime) {
          const venue = await this.db
            .collection('venues')
            .findOne({ _id: new ObjectId(venueId) });

          if (!venue) {
            throw new NotFoundException(`Venue with ID ${venueId} not found`);
          }

          const durationHours =
            (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          data.totalPrice = Math.ceil(durationHours) * venue.pricePerHour;
        }
      }

      const updateData = {
        ...data,
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        updatedAt: new Date(),
      };

      await this.db
        .collection('bookings')
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      await this.invalidateReservationCache(
        id,
        existingReservation.userId,
        data.venueId || existingReservation.venueId,
      );

      return this.findOne(id);
    } finally {
      if (lockAcquired && lockKey) {
        await this.releaseLock(lockKey);
      }
    }
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    user: any,
  ): Promise<any> {
    const reservation = await this.findOne(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (user.role !== 'admin') {
      if (reservation.userId !== user.id) {
        throw new ForbiddenException(
          'You can only modify your own reservations',
        );
      }

      if (status !== ReservationStatus.CANCELLED) {
        throw new ForbiddenException(
          'You can only cancel your own reservations',
        );
      }
    }

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    await this.db
      .collection('bookings')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    await this.invalidateReservationCache(
      id,
      reservation.userId,
      reservation.venueId,
    );

    return this.findOne(id);
  }

  async remove(id: string, user: any): Promise<any> {
    const reservation = await this.findOne(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (user.role !== 'admin' && reservation.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own reservations');
    }

    await this.db.collection('bookings').deleteOne({ _id: new ObjectId(id) });

    await this.invalidateReservationCache(
      id,
      reservation.userId,
      reservation.venueId,
    );

    return reservation;
  }
}
