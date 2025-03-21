import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  
  // Add connection options to improve stability
  await mongoose.connect(uri, { 
    dbName: 'testingDB',
    // Add these options to make connection more robust
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10
  });
  
  // Verify connection is ready
  if (mongoose.connection.db) {
    await mongoose.connection.db.admin().ping();
  } else {
    throw new Error('Database connection is not established.');
  }
  console.log('MongoDB Memory Server connected successfully');
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Make sure connection is established
  if (mongoose.connection.readyState !== 1) {
    console.log('Reconnecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string, { dbName: 'testingDB' });
  }
  
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established.');
    }
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error in beforeEach cleanup:', error);
    throw error; // Re-throw to make test fail with clear error
  }
});