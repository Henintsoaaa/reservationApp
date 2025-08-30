// MongoDB initialization script for reservation app

// Switch to reservation_db database
db = db.getSiblingDB('reservation_db');

// Create users collection with sample document
db.createCollection('users');
db.users.insertOne({
  username: 'admin',
  email: 'admin@example.com',
  password: 'hashed_password_here',
  role: 'admin',
  createdAt: new Date(),
});

// Create sample user
db.users.insertOne({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'hashed_password_here',
  role: 'user',
  createdAt: new Date(),
});

// Create resources collection with sample document
db.createCollection('resources');
db.resources.insertOne({
  name: 'Conference Room A',
  capacity: 20,
  location: 'Building 1, Floor 2',
  description: 'Large conference room with projector and whiteboard',
  createdAt: new Date(),
});

db.resources.insertOne({
  name: 'Meeting Room B',
  capacity: 8,
  location: 'Building 1, Floor 1',
  description: 'Small meeting room with TV screen',
  createdAt: new Date(),
});

// Create reservations collection (will add sample data after we have user and resource IDs)
db.createCollection('reservations');

// Get sample user and resource IDs for creating a reservation
const sampleUser = db.users.findOne({ username: 'john_doe' });
const sampleResource = db.resources.findOne({ name: 'Conference Room A' });

if (sampleUser && sampleResource) {
  db.reservations.insertOne({
    userId: sampleUser._id,
    resourceId: sampleResource._id,
    date: new Date('2025-08-31'),
    timeSlot: '14:00-15:00',
    status: 'confirmed',
    createdAt: new Date(),
  });
}

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.reservations.createIndex({ userId: 1, date: 1 });
db.reservations.createIndex({ resourceId: 1, date: 1 });

print('Database and collections initialized successfully!');
print('Collections created:');
db.getCollectionNames().forEach((collection) => print('- ' + collection));
