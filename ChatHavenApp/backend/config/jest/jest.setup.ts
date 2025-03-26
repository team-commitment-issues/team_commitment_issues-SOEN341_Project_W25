// packages/backend/config/jest/jest.setup.ts
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.test' });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'nQKpqUoax24EOZGF+1CMPYewP3lz0287g5O7aMmYWL9/ika/NdIc8q0TgpaCucftPu/cFgxUwGux2yasbpTUZg==';
}

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { shutdownDefaultRateLimiter } from '../../src/utils/rateLimiter';

let mongoServer: MongoMemoryServer;
mongoose.set('bufferTimeoutMS', 30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'testingDB' });
});

afterAll(async () => {
  shutdownDefaultRateLimiter();
  await mongoose.disconnect();
  await mongoServer.stop();
  await new Promise(resolve => setTimeout(resolve, 500));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  for (const collection of collections ?? []) {
    await collection.deleteMany({});
  }
});
