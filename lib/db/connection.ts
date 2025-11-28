import mongoose from 'mongoose';

// Default to local MongoDB if not set (for development)
const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/papirai';

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not set, using default: mongodb://localhost:27017/papirai');
  console.warn('   Make sure MongoDB is running locally or set MONGODB_URI in .env');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

