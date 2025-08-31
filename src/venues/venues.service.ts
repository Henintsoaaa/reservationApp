import { Injectable, Inject } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { CreateVenuesDto } from './dto/create-venues.dto';

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

  async create(venueData: CreateVenuesDto): Promise<any> {
    const result = await this.db.collection('venues').insertOne(venueData);
    const insertedVenue = await this.db
      .collection('venues')
      .findOne({ _id: result.insertedId });
    return insertedVenue;
  }

  async update(id: string, venueData: CreateVenuesDto): Promise<any> {
    await this.db
      .collection('venues')
      .updateOne({ _id: new ObjectId(id) }, { $set: venueData });
    return this.findOne(id);
  }

  async delete(id: string): Promise<any> {
    await this.db.collection('venues').deleteOne({ _id: new ObjectId(id) });
    return { deleted: true };
  }
}
