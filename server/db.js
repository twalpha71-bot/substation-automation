import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

let connectionPromise = null;

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
  }

  try {
    await connectionPromise;
    console.log('MongoDB Atlas connected successfully');
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}