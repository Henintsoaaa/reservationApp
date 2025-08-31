import { Injectable, Inject } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { CreateVenueDto } from './dto/create-venues.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(@Inject('MONGO') private db: Db) {}

  async findAll(): Promise<any[]> {
    const venues = await this.db.collection('venues').find().toArray();
    return venues;
  }

  async findOne(id: string): Promise<any> {
    const venue = await this.db
      .collection('venues')
      .findOne({ _id: new ObjectId(id) });
    return venue;
  }

  async create(venueData: CreateVenueDto): Promise<any> {
    const result = await this.db.collection('venues').insertOne({
      ...venueData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const insertedVenue = await this.db
      .collection('venues')
      .findOne({ _id: result.insertedId });
    return insertedVenue;
  }

  async update(id: string, venueData: UpdateVenueDto): Promise<any> {
    await this.db.collection('venues').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...venueData,
          updatedAt: new Date(),
        },
      },
    );
    return this.findOne(id);
  }

  async findAvailableVenues(startTime: Date, endTime: Date): Promise<any[]> {
    // Get all venues
    const allVenues = await this.findAll();

    // Check availability for each venue
    const availableVenues: any[] = [];

    for (const venue of allVenues) {
      const conflictingReservation = await this.db
        .collection('bookings')
        .findOne({
          venueId: venue._id.toString(),
          status: { $in: ['pending', 'confirmed'] },
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
        });

      if (!conflictingReservation) {
        // Calculate duration and total price
        const durationHours =
          (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const totalPrice = Math.ceil(durationHours) * venue.pricePerHour;

        availableVenues.push({
          ...venue,
          estimatedPrice: totalPrice,
          duration: Math.ceil(durationHours),
        });
      }
    }

    return availableVenues;
  }

  async delete(id: string): Promise<any> {
    await this.db.collection('venues').deleteOne({ _id: new ObjectId(id) });
    return { deleted: true };
  }
}
