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
  'https://pwabit-ckeb.vercel.app',
  'https://pwabit.onrender.com',
  'https://powabitz.onrender.com'
];

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Socket.io for real-time balance/transaction updates
const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin and from allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`[Socket.IO CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowUpgrade: true,
  upgrade: true, // Allow transports to upgrade (polling -> websocket)
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6,
  serveClient: true,
  perMessageDeflate: {
    threshold: 1024
  }
});

// Make Socket.IO globally available for API routes
global.socketIO = io;

console.log('[Socket.IO] Made available globally for API routes');

// Initialize transaction service with Socket.io
initTransactionService(io);

// Import ChatMessage model for socket events
import ChatMessage from './models/ChatMessage.js';

// Socket.io connection handling with detailed logging
io.on('connection', (socket) => {
  const transportName = socket.conn?.transport?.name || 'unknown';
  console.log('[Socket.IO] Client connected:', {
    socketId: socket.id,
    transport: transportName,
    remoteAddress: socket.conn?.remoteAddress,
    timestamp: new Date().toISOString()
  });

  // Join user-specific room for targeted updates
  socket.on('join', (userId) => {
    if (userId) {
      const roomId = `user_${userId}`;
      socket.join(roomId);
      console.log(`[Socket.IO] User ${userId} joined room: ${roomId}`);
    }
  });

  // Admin joins admin room for dashboard updates and real-time messages
  socket.on('join-admin', (adminId) => {
    if (adminId) {
      socket.join('admin');
      socket.join('admin-messages');
      console.log(`[Socket.IO] Admin ${adminId} joined admin room and admin-messages room`);
    }
  });

  // Leave user room
  socket.on('leave', (userId) => {
    if (userId) {
      const roomId = `user_${userId}`;
      socket.leave(roomId);
      console.log(`[Socket.IO] User ${userId} left room: ${roomId}`);
    }
  });

  // Real-time message handler: receive user message and broadcast to admin
  socket.on('send-message', async (data) => {
    try {
      const { userName, userEmail, message, userId, subject } = data;
      
      console.log('[Socket.IO] New message received:', {
        userName,
        userEmail,
        userId,
        subject,
        hasMessage: !!message
      });

      // Save message to database
      const chatMessage = new ChatMessage({
        userId: userId || null,
        userEmail,
        userName,
        sender: userId ? 'user' : 'contact',
        message,
        subject: subject || undefined,
        hasText: !!message,
        hasImage: false,
        isResolved: false,
        timestamp: new Date()
      });

      await chatMessage.save();
      console.log('[Socket.IO] Message saved to database:', chatMessage._id);

      // Broadcast to admin room
      io.to('admin-messages').emit('new-message', {
        _id: chatMessage._id,
        userName,
        userEmail,
        userId,
        message,
        subject,
        sender: userId ? 'user' : 'contact',
        timestamp: chatMessage.timestamp,
        isResolved: false
      });

      console.log('[Socket.IO] New message broadcasted to admin room');
    } catch (error) {
      console.error('[Socket.IO] Error handling send-message:', error.message);
      socket.emit('message-error', { message: 'Failed to send message', error: error.message });
    }
  });

  // Admin sends reply to user
  socket.on('send-reply', async (data) => {
    try {
      const { messageId, replyText, adminId, userId } = data;
      
      console.log('[Socket.IO] Admin reply received:', {
        messageId,
        adminId,
        userId,
        hasReply: !!replyText
      });

      // Find and update message
      const message = await ChatMessage.findByIdAndUpdate(
        messageId,
        {
          repliedBy: adminId,
          replyTime: new Date(),
          isResolved: true,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!message) {
        throw new Error('Message not found');
      }

      // Create reply message
      const replyMessage = new ChatMessage({
        userId: userId || null,
        userEmail: message.userEmail,
        userName: 'Admin Support',
        sender: 'admin',
        message: replyText,
        hasText: true,
        hasImage: false,
        isResolved: false,
        timestamp: new Date()
      });

      await replyMessage.save();

      // Notify user about reply
      if (userId) {
        io.to(`user_${userId}`).emit('admin-reply', {
          messageId,
          replyId: replyMessage._id,
          replyText,
          timestamp: replyMessage.timestamp
        });
      }

      // Notify admin room
      io.to('admin-messages').emit('message-updated', {
        messageId,
        status: 'replied',
        repliedAt: message.replyTime
      });

      console.log('[Socket.IO] Admin reply sent and broadcasted');
    } catch (error) {
      console.error('[Socket.IO] Error handling send-reply:', error.message);
      socket.emit('reply-error', { message: 'Failed to send reply', error: error.message });
    }
  });

  // Admin marks message as resolved
  socket.on('resolve-message', async (data) => {
    try {
      const { messageId } = data;

      await ChatMessage.findByIdAndUpdate(
        messageId,
        { isResolved: true, updatedAt: new Date() },
        { new: true }
      );

      io.to('admin-messages').emit('message-resolved', { messageId });
      console.log('[Socket.IO] Message marked as resolved:', messageId);
    } catch (error) {
      console.error('[Socket.IO] Error resolving message:', error.message);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('[Socket.IO] Socket error:', socket.id, error);
  });

  socket.conn.on('upgrade', (transport) => {
    console.log('[Socket.IO] Transport upgraded for socket', socket.id, 'to:', transport.name);
  });

  socket.conn.on('error', (error) => {
    console.error('[Socket.IO] Connection error for socket', socket.id, ':', error.message || error);
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

// Enhanced CORS configuration with explicit OPTIONS handling
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response'],
  maxAge: 3600,
  optionsSuccessStatus: 200 // For legacy browsers
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit OPTIONS preflight handler for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
import adminRoutes, { setSocketIO as setAdminSocketIO } from './routes/admin.js';
import activityRoutes from './routes/activities.js';
import walletRoutes, { setSocketIO as setWalletSocketIO } from './routes/wallets.js';
import kycRoutes from './routes/kyc.js';
import gameRoutes, { setSocketIO as setGameSocketIO } from './routes/games.js';
import walletAddressRoutes, { setSocketIO as setWalletAddressSocketIO } from './routes/wallet-addresses.js';
import powaupRoutes from './routes/powaup.js';
import giveawayRoutes from './routes/giveaway.js';

// Initialize Socket.io for routes
setWalletSocketIO(io);
setAdminSocketIO(io);
setWalletAddressSocketIO(io);
setGameSocketIO(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    socketio: 'configured',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint for debugging
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    backend: 'healthy',
    database: 'connected',
    socketio: {
      connected_clients: io.engine.clientsCount,
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    },
    timestamp: new Date().toISOString()
  });
});

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
app.use('/api/giveaway', giveawayRoutes);

// Start real-time services
import { startPriceUpdates } from './services/cryptoService.js';
import { startDailyReturnsScheduler, setIOInstance } from './services/returnsService.js';

startPriceUpdates();

// Initialize Socket.io for returnsService before starting scheduler
setIOInstance(io);

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
