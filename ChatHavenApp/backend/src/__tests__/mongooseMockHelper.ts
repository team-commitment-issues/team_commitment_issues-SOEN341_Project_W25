// test/helpers/mongooseMockHelper.ts

/**
 * Creates a mock Mongoose query that resolves to the provided value
 * This simulates the Query object that Mongoose methods return
 */
export function createMockMongooseQuery(resolveValue: any) {
    const mockQuery = {
      exec: jest.fn().mockResolvedValue(resolveValue),
      lean: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((resolve) => Promise.resolve(resolveValue).then(resolve)),
      catch: jest.fn().mockImplementation((reject) => Promise.resolve(resolveValue).catch(reject)),
      orFail: jest.fn().mockReturnThis(),
    };
    
    return mockQuery;
  }