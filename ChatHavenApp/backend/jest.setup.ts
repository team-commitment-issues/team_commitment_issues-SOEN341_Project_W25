import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Utility function to verify database connection
const verifyDbConnection = async (retries = 3, delay = 1000): Promise<boolean> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        console.log(`MongoDB connection verified on attempt ${attempt}`);
        return true;
      } else {
        console.log(`Connection not ready on attempt ${attempt}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Connection verification failed on attempt ${attempt}:`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
};

// Handle mongoose connection events for better debugging
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});

// Connection setup - with retry mechanism
beforeAll(async () => {
  try {
    // Close any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Create the MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    
    console.log('MongoDB Memory Server created, URI:', uri);
    
    // Connect with robust options
    await mongoose.connect(uri, { 
      dbName: 'testingDB',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      family: 4, // Force IPv4
      autoIndex: false, // Don't build indexes
    });
    
    // Verify connection with retries
    const isConnected = await verifyDbConnection(5, 1000);
    if (!isConnected) {
      throw new Error('Failed to establish MongoDB connection after multiple attempts');
    }
    
    console.log('MongoDB Memory Server connection established successfully');
    
    // Ensure clean DB state at start
    const collections = mongoose.connection.db ? await mongoose.connection.db.collections() : [];
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    
  } catch (error) {
    console.error('beforeAll setup failed:', error);
    throw error; // Re-throw to fail tests early with clear error
  }
}, 60000); // Extend timeout for this setup

// Cleanup after all tests complete
afterAll(async () => {
  try {
    console.log('Cleaning up after tests');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Mongoose disconnected successfully');
    }
    
    if (mongoServer) {
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped successfully');
    }
  } catch (error) {
    console.error('afterAll cleanup failed:', error);
    process.exit(1); // Force exit to prevent hanging
  }
}, 30000); // Extend timeout for cleanup

// Reset collections before each test
beforeEach(async () => {
  try {
    // Verify connection is still active
    if (mongoose.connection.readyState !== 1) {
      console.log('Reconnecting to MongoDB before test...');
      await mongoose.connect(process.env.MONGO_URI as string, { dbName: 'testingDB' });
      
      const isConnected = await verifyDbConnection(3, 500);
      if (!isConnected) {
        throw new Error('Failed to re-establish MongoDB connection');
      }
    }
    
    // Clean all collections
    const collections = mongoose.connection.db ? await mongoose.connection.db.collections() : [];
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('beforeEach cleanup failed:', error);
    throw error; // Re-throw to fail the test with clear error
  }
});