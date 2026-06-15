// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error.middleware');

// Routes imports
const authRoutes = require('./routes/auth.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const aiRoutes = require('./routes/ai.routes');

// Initialize Express application
const app = express();
const server = http.createServer(app);

// Initialize Socket.io server with CORS configurations
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins for local testing and offline sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Establish connection to MongoDB
connectDB();

// Global Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io injection middleware: makes 'io' accessible in route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Rate Limiting: protects endpoints from brute force and denial of service
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 200, // Limit each IP to 200 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ai', aiRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
  });
});

// WebSocket Connection Events
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle client join-room for specific notifications if needed
  socket.on('join_kitchen', () => {
    socket.join('kitchen_room');
    console.log(`Socket ${socket.id} joined kitchen updates room.`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Register Central Error Handler Middleware (MUST be last)
app.use(errorHandler);

// Define PORT and run the server
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`EcoMeal Backend Server running in production-ready mode on port ${PORT}`);
  });
}

module.exports = app;
