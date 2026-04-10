import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import 'express-async-errors';
import { connectDB } from './config/database.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initTransactionService } from './services/transactionService.js';

// Load environment variables
dotenv.config();

// Allowed origins for CORS and Socket.IO
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://powabitz.com',
  'https://www.powabitz.com',
  'https://pwabit-ckeb.vercel.app'
];

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Socket.io for real-time balance/transaction updates
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io'
});

// Initialize transaction service with Socket.io
initTransactionService(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected:', socket.id);

  // Join user-specific room for targeted updates
  socket.on('join', (userId) => {
    if (userId) {
      const roomId = `user_${userId}`;
      socket.join(roomId);
      console.log(`[Socket.io] User ${userId} joined room: ${roomId}`);
    }
  });

  // Leave user room
  socket.on('leave', (userId) => {
    if (userId) {
      const roomId = `user_${userId}`;
      socket.leave(roomId);
      console.log(`[Socket.io] User ${userId} left room: ${roomId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Client disconnected:', socket.id);
  });
});

// Connect to Database
await connectDB();

// Initialize admin user if not exists
import Admin from './models/Admin.js';

const initializeDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: 'admin@powabitz.com' });
    if (!adminExists) {
      const admin = new Admin({
        fullName: 'Admin User',
        email: 'admin@powabitz.com',
        password: 'Admin@123456',
        role: 'super_admin'
      });
      await admin.save();
      console.log('[v0] Default admin created: admin@powabitz.com');
    }
  } catch (error) {
    console.error('[v0] Error initializing admin:', error.message);
  }
};

await initializeDefaultAdmin();

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// WebSocket for real-time crypto prices
wss.on('connection', (ws) => {
  console.log('[WS] New client connected');
  
  ws.on('message', (message) => {
    console.log('[WS] Received:', message);
  });
  
  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('[WS] Error:', error);
  });
});

// Broadcast crypto prices to all connected clients
export const broadcastCryptoPrices = (prices) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify({ type: 'crypto_prices', data: prices }));
    }
  });
};

// Import routes
import authRoutes from './routes/auth.js';
import investmentRoutes from './routes/investments.js';
import adminRoutes from './routes/admin.js';
import activityRoutes from './routes/activities.js';
import walletRoutes from './routes/wallets.js';
import kycRoutes from './routes/kyc.js';
import gameRoutes from './routes/games.js';
import walletAddressRoutes from './routes/wallet-addresses.js';
import powaupRoutes from './routes/powaup.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/wallet-addresses', walletAddressRoutes);
app.use('/api/powaup', powaupRoutes);

// Start real-time services
import { startPriceUpdates } from './services/cryptoService.js';
import { startDailyReturnsScheduler } from './services/returnsService.js';

startPriceUpdates();
startDailyReturnsScheduler();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

export { app, server, wss, io };
