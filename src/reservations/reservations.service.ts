import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import {
  CreateReservationDto,
  ReservationStatus,
} from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(@Inject('MONGO') private db: Db) {}

  async findAll(): Promise<any[]> {
    return this.db.collection('bookings').find().toArray();
  }

  async findByUserId(userId: string): Promise<any[]> {
    return this.db
      .collection('bookings')
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findOne(id: string): Promise<any> {
    return this.db.collection('bookings').findOne({ _id: new ObjectId(id) });
  }

  async findOneWithOwnershipCheck(id: string, user: any): Promise<any> {
    const reservation = await this.findOne(id);

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // Admin can view all reservations, users can only view their own
    if (user.role !== 'admin' && reservation.userId !== user.id) {
      throw new ForbiddenException('You can only view your own reservations');
    }

    return reservation;
  }

  async create(data: CreateReservationDto, userId: string): Promise<any> {
    // Validate venue exists
    const venue = await this.db
      .collection('venues')
      .findOne({ _id: new ObjectId(data.venueId) });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${data.venueId} not found`);
    }

    // Validate dates
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Cannot book a venue in the past');
    }

    // Check availability
    const isAvailable = await this.checkAvailability(
      data.venueId,
      startTime,
      endTime,
    );
    if (!isAvailable) {
      throw new BadRequestException(
        'Venue is not available during the requested time period',
      );
    }

    // Calculate total price
    const durationHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const calculatedPrice = Math.ceil(durationHours) * venue.pricePerHour;

    const reservationData = {
      userId: userId, // Use the authenticated user's ID
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
    return this.db.collection('bookings').findOne({ _id: result.insertedId });
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
        // New reservation starts during an existing reservation
        {
          startTime: { $lte: startTime },
          endTime: { $gt: startTime },
        },
        // New reservation ends during an existing reservation
        {
          startTime: { $lt: endTime },
          endTime: { $gte: endTime },
        },
        // New reservation completely contains an existing reservation
        {
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
        // Existing reservation completely contains new reservation
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
      ],
    };

    // Exclude current reservation when updating
    if (excludeReservationId) {
      query._id = { $ne: new ObjectId(excludeReservationId) };
    }

    const conflictingReservation = await this.db
      .collection('reservations')
      .findOne(query);

    return !conflictingReservation;
  }

  async getVenueAvailability(venueId: string, date: string): Promise<any> {
    // Validate venue exists
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
      .collection('reservations')
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

    return {
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

    // Check ownership - users can only update their own reservations, admins can update any
    if (user.role !== 'admin' && existingReservation.userId !== user.id) {
      throw new ForbiddenException('You can only update your own reservations');
    }

    // If updating time or venue, check availability
    if (data.startTime || data.endTime || data.venueId) {
      const venueId = data.venueId || existingReservation.venueId;
      const startTime = data.startTime
        ? new Date(data.startTime)
        : existingReservation.startTime;
      const endTime = data.endTime
        ? new Date(data.endTime)
        : existingReservation.endTime;

      // Validate dates
      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      // Check availability (excluding current reservation)
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

      // Recalculate price if venue or time changed
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
    return this.findOne(id);
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

    // Only admins can change status
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only administrators can update reservation status',
      );
    }

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    await this.db
      .collection('bookings')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    return this.findOne(id);
  }

  async remove(id: string, user: any): Promise<any> {
    const reservation = await this.findOne(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // Check ownership - users can only delete their own reservations, admins can delete any
    if (user.role !== 'admin' && reservation.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own reservations');
    }

    await this.db.collection('bookings').deleteOne({ _id: new ObjectId(id) });
    return reservation;
  }
}
