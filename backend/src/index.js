import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import configurations and utils
import { connectDB, closeDB } from './config/db.js';
import { initRedis } from './config/redis.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import logger from './utils/logger.js';

// Import models for seeding
import User from './models/User.js';

// Load Env
dotenv.config();

const app = express();
const httpServer = createServer(app);

// 1. Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('socketio', io);
global.io = io;

io.on('connection', (socket) => {
  logger.info(`Socket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Socket client disconnected: ${socket.id}`);
  });
});

// 2. Global Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

// 3. Register Routes
app.use('/api', apiRouter);

// Standard healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// 4. Error Handling Middleware
app.use(errorHandler);

// 5. Seed Super Admin (for out-of-box usability)
async function seedSuperAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'Super Admin' });
    if (!adminExists) {
      const superAdmin = new User({
        username: 'admin',
        password: 'AknuAdmin@123', // Seeds hashed automatically in pre-save hook
        role: 'Super Admin',
        email: 'admin@aknu.edu.in',
        mobile: '9876543210',
        isActive: true
      });
      await superAdmin.save();
      logger.info('====================================================');
      logger.info('SEED: Default Super Admin account created successfully!');
      logger.info('Username: admin');
      logger.info('Password: AknuAdmin@123');
      logger.info('====================================================');
    }
  } catch (error) {
    logger.error('Error seeding default super admin', error);
  }
}

// 6. Startup Sequence
const PORT = process.env.PORT || 5000;

async function startServer() {
  // A. Connect to MongoDB
  await connectDB();

  // B. Initialize Redis (falls back to memory mode if Redis is down)
  initRedis();

  // E. Seed Super Admin credentials
  await seedSuperAdmin();

  // F. Bind HTTP listener
  httpServer.listen(PORT, () => {
    logger.info(`EDEP Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });

  // G. Graceful Shutdown
  const shutdown = async () => {
    logger.info('Shutting down EDEP server gracefully...');
    await closeDB();
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((error) => {
  logger.error('Failed to start EDEP server', error);
});
