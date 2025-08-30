import { Inject, Injectable } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('MONGO') private db: Db) {}

  findAll() {
    return this.db.collection('users').find().toArray();
  }

  findOne(id: string) {
    return this.db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  findByEmail(email: string) {
    return this.db.collection('users').findOne({ email });
  }

  create(user: CreateUserDto) {
    const userData = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.db.collection('users').insertOne(userData);
  }

  async update(id: string, user: UpdateUserDto) {
    const updateData: any = {
      ...user,
      updatedAt: new Date(),
    };

    // Hash password if it's being updated
    if (user.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(user.password, saltRounds);
    }

    await this.db
      .collection('users')
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Return the updated user data
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.db.collection('users').deleteOne({ _id: new ObjectId(id) });
  }
}
