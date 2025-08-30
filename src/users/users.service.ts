import { Inject, Injectable } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
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

  findByUsername(username: string) {
    return this.db.collection('users').findOne({ username });
  }

  create(user: CreateUserDto) {
    return this.db.collection('users').insertOne(user);
  }

  update(id: string, user: UpdateUserDto) {
    return this.db
      .collection('users')
      .updateOne({ _id: new ObjectId(id) }, { $set: user });
  }
}
