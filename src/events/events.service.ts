import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(@Inject('MONGO') private db: Db) {}

  async findAll(): Promise<any[]> {
    const events = await this.db.collection('events').find().toArray();
    return events.map((event) => ({
      ...event,
      id: event._id.toString(),
    }));
  }

  async findOne(id: string): Promise<any> {
    // Valider que l'ID est un ObjectId valide
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event ID format');
    }

    const event = await this.db
      .collection('events')
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...event,
      id: event._id.toString(),
    };
  }

  async create(eventData: CreateEventDto): Promise<any> {
    const result = await this.db.collection('events').insertOne({
      ...eventData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const insertedEvent = await this.db
      .collection('events')
      .findOne({ _id: result.insertedId });

    if (insertedEvent) {
      return {
        ...insertedEvent,
        id: insertedEvent._id.toString(),
      };
    }
    return insertedEvent;
  }

  async update(id: string, eventData: UpdateEventDto): Promise<any> {
    // Valider que l'ID est un ObjectId valide
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event ID format');
    }

    const result = await this.db.collection('events').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...eventData,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Event not found');
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<any> {
    // Valider que l'ID est un ObjectId valide
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid event ID format');
    }

    const result = await this.db
      .collection('events')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Event not found');
    }

    return { deleted: true };
  }

  async findAvailableEvents(): Promise<any[]> {
    const events = await this.db
      .collection('events')
      .find({
        status: 'active',
        availableSeats: { $gt: 0 },
        date: { $gte: new Date() },
      })
      .toArray();

    return events.map((event) => ({
      ...event,
      id: event._id.toString(),
    }));
  }
}
