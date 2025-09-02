import { Module, Global } from '@nestjs/common';
import { MongoClient } from 'mongodb';

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://root:azertyuiop@localhost:27017/?authSource=admin';
const dbName = process.env.MONGODB_DB || 'reservation_events_db';

const client = new MongoClient(mongoUri);

@Global()
@Module({
  providers: [
    {
      provide: 'MONGO',
      useFactory: async () => {
        try {
          await client.connect();
          return client.db(dbName);
        } catch (error) {
          console.error('Failed to connect to MongoDB:', error);
          throw error;
        }
      },
    },
  ],
  exports: ['MONGO'],
})
export class DatabaseModule {}
