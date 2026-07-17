import mongoose from 'mongoose';
import dns from 'dns';
import logger from '../utils/logger.js';

// Prioritize IPv4 and use public DNS servers (Google/Cloudflare) to bypass local router DNS SRV record blocks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  logger.warn('Failed to set custom DNS servers, using system default.');
}
dns.setDefaultResultOrder('ipv4first');

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edep';
  try {
    logger.info(`Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB database.');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

export async function closeDB() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
  } catch (error) {
    logger.error('Error during MongoDB disconnection', error);
  }
}
