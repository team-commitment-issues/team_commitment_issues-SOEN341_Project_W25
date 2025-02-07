import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import userRoutes from '../routes/userRoutes';

jest.setTimeout(30000); 

//let mongoServer: MongoMemoryServer;
const app = express();
app.use(express.json());
app.use('/user', userRoutes);
app.use('/channel', channelRoutes);
/*

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
  });

  // ✅ Ensure MongoDB connection is ready
  mongoose.connection.once('open', () => {
    console.log('Test MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
});

afterAll(async () => {
  await mongoose.connection.close(); // ✅ Close DB connection properly
  await mongoServer.stop();
});

beforeEach(async () => {
  if (mongoServer) {
    await mongoose.connection.db?.dropDatabase(); // ✅ Reset database before each test
  }
});*/

describe('POST /channel/create', () => {
  it('should create a new channel successfully', async () => {
    const newUser = {
      email: 'john@doe.com',
      password: 'testpassword',
      firstName: 'John',
      lastName: 'Doe',
      userID: 'johndoe',
    };

    // ✅ Step 1: Sign up the user
    await request(app)
      .post('/user/signUp')
      .send(newUser)
      .expect(201);

    const response = await request(app)
      .post('/channel/create')
      .send({
        name: 'general',
        description: 'General channel',
        userId: 'johndoe',
      })
      .expect(201);

    expect(response.body.message).toBe('Channel created successfully');
    expect(response.body.channel.name).toBe('general');
  });

  it('should fail if userId is missing', async () => {
    const response = await request(app)
      .post('/channel/create')
      .send({
        name: 'random',
        description: 'Random discussion channel',
      })
      .expect(400);

    expect(response.body.error).toBe('userId is required');
  });

  it('should fail if the user does not exist', async () => {
    const response = await request(app)
      .post('/channel/create')
      .send({
        name: 'random',
        description: 'Random discussion channel',
        userId: 'nonexistentUser',
      })
      .expect(400);

    expect(response.body.error).toBe('User not found');
  });

  it('should not allow duplicate channel names', async () => {
    const newUser = {
      email: 'jane@doe.com',
      password: 'testpassword',
      firstName: 'Jane',
      lastName: 'Doe',
      userID: 'janedoe',
    };

    await request(app)
      .post('/user/signUp')
      .send(newUser)
      .expect(201);

    await request(app)
      .post('/channel/create')
      .send({
        name: 'random',
        description: 'Random discussion channel',
        userId: 'janedoe',
      })
      .expect(201);

    const response = await request(app)
      .post('/channel/create')
      .send({
        name: 'random',
        description: 'Duplicate channel',
        userId: 'janedoe',
      })
      .expect(400);

    expect(response.body.error).toBe('Channel name already exists');
  });
});
