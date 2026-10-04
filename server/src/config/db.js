import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uriFromEnv = process.env.MONGODB_URI;
  const isTest = process.env.NODE_ENV === 'test';

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // In test mode or when requested, use MongoMemoryServer directly
  if (isTest) {
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] Connected to in-memory MongoDB (Test mode): ${uri}`);
    return mongoose.connection;
  }

  // Try connecting to provided URI if any
  if (uriFromEnv) {
    try {
      await mongoose.connect(uriFromEnv, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[Database] Connected to MongoDB at ${uriFromEnv}`);
      return mongoose.connection;
    } catch (err) {
      console.warn(`[Database] Could not connect to external MongoDB at ${uriFromEnv}: ${err.message}`);
      console.log(`[Database] Falling back to automated in-memory MongoDB...`);
    }
  }

  // Fallback to MongoMemoryServer so the app runs out-of-the-box anywhere
  mongoMemoryServer = await MongoMemoryServer.create();
  const uri = mongoMemoryServer.getUri();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[Database] Connected to in-memory MongoDB instance: ${uri}`);
  return mongoose.connection;
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
};
