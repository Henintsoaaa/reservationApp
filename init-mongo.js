db = db.getSiblingDB('reservation_events_db');

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
  {
    name: 'Marie Rasoamalala',
    email: 'marie@example.com',
    password: 'password3',
    role: 'user',
    phone: '+261342222222',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print('Creating events collection...');
db.createCollection('events');

db.events.insertMany([
  {
    title: 'Concert Jazz - Mahaleo',
    description: 'Concert exceptionnel du groupe Mahaleo au Palais des Sports',
    category: 'concert',
    date: new Date('2025-10-15T19:00:00Z'),
    duration: 180, // en minutes
    venue: {
      name: 'Palais des Sports',
      address: 'Mahamasina, Antananarivo',
      city: 'Antananarivo',
    },
    totalSeats: 500,
    availableSeats: 500,
    ticketPrice: 25000,
    organizer: 'Music Events Madagascar',
    status: 'active', // active, cancelled, completed
    imageUrl: '/images/concert-mahaleo.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Conférence Tech - IA et Développement',
    description:
      "Conférence sur l'intelligence artificielle et le développement web moderne",
    category: 'conference',
    date: new Date('2025-09-20T14:00:00Z'),
    duration: 240,
    venue: {
      name: 'CCESSCA',
      address: 'Anosy, Antananarivo',
      city: 'Antananarivo',
    },
    totalSeats: 100,
    availableSeats: 95,
    ticketPrice: 15000,
    organizer: 'Tech Community Madagascar',
    status: 'active',
    imageUrl: '/images/conference-tech.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Spectacle - Hira Gasy Moderne',
    description:
      'Spectacle traditionnel malagasy revisité avec une touche contemporaine',
    category: 'spectacle',
    date: new Date('2025-11-05T16:00:00Z'),
    duration: 120,
    venue: {
      name: 'Théâtre de Verdure',
      address: 'Tsimbazaza, Antananarivo',
      city: 'Antananarivo',
    },
    totalSeats: 200,
    availableSeats: 180,
    ticketPrice: 12000,
    organizer: 'Culture Malagasy Production',
    status: 'active',
    imageUrl: '/images/hira-gasy.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print('Creating bookings collection...');
db.createCollection('bookings');

const sampleUser = db.users.findOne({ email: 'john@example.com' });
const sampleEvent = db.events.findOne({
  title: 'Conférence Tech - IA et Développement',
});

if (sampleUser && sampleEvent) {
  db.bookings.insertOne({
    userId: sampleUser._id,
    eventId: sampleEvent._id,
    numberOfTickets: 2,
    totalPrice: 30000,
    status: 'confirmed', // pending, confirmed, cancelled
    bookingReference: 'BK' + Date.now(),
    contactInfo: {
      email: sampleUser.email,
      phone: sampleUser.phone,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Mise à jour des places disponibles
  db.events.updateOne(
    { _id: sampleEvent._id },
    {
      $inc: { availableSeats: -2 },
      $set: { updatedAt: new Date() },
    },
  );
}

print('Creating payments collection...');
db.createCollection('payments');

const sampleBooking = db.bookings.findOne({ userId: sampleUser._id });

if (sampleBooking) {
  db.payments.insertOne({
    bookingId: sampleBooking._id,
    amount: 30000,
    method: 'mobile_money', // cash, card, mobile_money, bank_transfer
    status: 'paid', // pending, paid, failed, refunded
    transactionId: 'TXN' + Date.now(),
    createdAt: new Date(),
  });
}

print('Creating reviews collection (optional)...');
db.createCollection('reviews');

// Exemple d'avis (pour un événement passé)
if (sampleUser && sampleEvent) {
  db.reviews.insertOne({
    userId: sampleUser._id,
    eventId: sampleEvent._id,
    rating: 5,
    comment: 'Excellent événement, très bien organisé !',
    createdAt: new Date(),
  });
}

print('Creating indexes...');

// Index pour users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Index pour events
db.events.createIndex({ category: 1 });
db.events.createIndex({ date: 1 });
db.events.createIndex({ 'venue.city': 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ ticketPrice: 1 });
db.events.createIndex({ availableSeats: 1 });
db.events.createIndex({ title: 'text', description: 'text' }); // Pour la recherche textuelle

// Index pour bookings
db.bookings.createIndex({ userId: 1 });
db.bookings.createIndex({ eventId: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ bookingReference: 1 }, { unique: true });
db.bookings.createIndex({ createdAt: 1 });

// Index pour payments
db.payments.createIndex({ bookingId: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ method: 1 });
db.payments.createIndex({ transactionId: 1 });

// Index pour reviews
db.reviews.createIndex({ userId: 1 });
db.reviews.createIndex({ eventId: 1 });
db.reviews.createIndex({ rating: 1 });

print('Database and collections initialized successfully!');
print('Collections created:');
db.getCollectionNames().forEach((collection) => print('- ' + collection));

print('\nSample data summary:');
print('Users: ' + db.users.countDocuments());
print('Events: ' + db.events.countDocuments());
print('Bookings: ' + db.bookings.countDocuments());
print('Payments: ' + db.payments.countDocuments());
print('Reviews: ' + db.reviews.countDocuments());

print('\nEvents by category:');
const categories = db.events
  .aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
  .toArray();
categories.forEach((cat) => print(`- ${cat._id}: ${cat.count}`));
