import mongoose from 'mongoose';
import { connectDB } from './db.js';

try {
  await connectDB();
  await mongoose.connection.db.admin().ping();
  console.log('MongoDB ping successful');
} catch (error) {
  console.error('Database connection test failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}