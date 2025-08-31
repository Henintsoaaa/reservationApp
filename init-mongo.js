db = db.getSiblingDB('reservation_db');

print('Dropping existing collections...');
const collections = db.getCollectionNames();
collections.forEach((collection) => {
  db.getCollection(collection).drop();
  print('Dropped collection: ' + collection);
});

print('Creating users collection...');
db.createCollection('users');

db.users.insertMany([
  {
    name: 'Henintsoa',
    email: 'henintsoa@example.com',
    password: 'password',
    role: 'admin',
    phone: '+261340000000',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password2',
    role: 'user',
    phone: '+261341111111',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print('Creating venues collection...');
db.createCollection('venues');

db.venues.insertMany([
  {
    name: 'CCESSCA',
    description: 'Salle équipée pour réunions et conférences',
    location: {
      address: 'Anosy, Antananarivo',
      city: 'Antananarivo',
    },
    capacity: 100,
    pricePerHour: 50000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'IFM',
    description: "Salle moderne pour réunions d'équipe",
    location: {
      address: 'Centre ville, Antsirabe',
      city: 'Antsirabe',
    },
    capacity: 50,
    pricePerHour: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print('Creating bookings collection...');
db.createCollection('bookings');

const sampleUser = db.users.findOne({ email: 'john@example.com' });
const sampleVenue = db.venues.findOne({ name: 'Salle de conférence Tana' });

if (sampleUser && sampleVenue) {
  db.bookings.insertOne({
    userId: sampleUser._id,
    venueId: sampleVenue._id,
    startTime: new Date('2025-09-01T10:00:00Z'),
    endTime: new Date('2025-09-01T12:00:00Z'),
    status: 'confirmed',
    totalPrice: 100000,
    createdAt: new Date(),
  });
}

print('Creating payments collection...');
db.createCollection('payments');

const sampleBooking = db.bookings.findOne({ userId: sampleUser._id });

if (sampleBooking) {
  db.payments.insertOne({
    bookingId: sampleBooking._id,
    amount: 100000,
    method: 'cash',
    status: 'paid',
    createdAt: new Date(),
  });
}

print('Creating indexes...');

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.venues.createIndex({ 'location.city': 1 });
db.venues.createIndex({ capacity: 1 });
db.venues.createIndex({ pricePerHour: 1 });

db.bookings.createIndex({ userId: 1 });
db.bookings.createIndex({ venueId: 1 });
db.bookings.createIndex({ startTime: 1, endTime: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ venueId: 1, startTime: 1, endTime: 1 });

db.payments.createIndex({ bookingId: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ method: 1 });

print('Database and collections initialized successfully!');
print('Collections created:');
db.getCollectionNames().forEach((collection) => print('- ' + collection));

print('\nSample data summary:');
print('Users: ' + db.users.countDocuments());
print('Venues: ' + db.venues.countDocuments());
print('Bookings: ' + db.bookings.countDocuments());
print('Payments: ' + db.payments.countDocuments());
