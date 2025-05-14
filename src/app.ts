import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http'; // Import http module
import { Server as SocketIOServer, Socket } from 'socket.io'; // Import Socket.IO Server and Socket type
import { initDb } from './config/database';
import authRoutes from './routes/authRoutes';
import alarmRoutes from './routes/alarmRoutes';
import deviceRoutes from './routes/deviceRoutes'; // Import device routes
import logger from './utils/logger';
import { 
  configureIoInstance, 
  setupSocketAuth, 
  handleSocketConnection, 
  SocketWithAuth // Import SocketWithAuth if needed for casting
} from './services/socketService';

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost",
      "http://localhost:4200",
      "http://localhost:8100", 
      "http://10.0.2.2:8100",
      "capacitor://localhost", // Added for Capacitor iOS
      "ionic://localhost", // Added for Ionic iOS
      "http://localhost:8080", // If using different port for live reload or specific proxy
      "https://timely.mahermaker.me" // Replaced ngrok URL with Cloudflare URL
    ],
    methods: ["GET", "POST"],
    credentials: true // Allow credentials for socket connection
  }
});

// Configure the socket service with the main io instance
configureIoInstance(io);

// Setup Socket.IO authentication middleware
setupSocketAuth(io);

// Middleware
app.use(cors({
  origin: [
    "http://localhost",
    "http://localhost:4200",
    "http://localhost:8100",
    "http://10.0.2.2:8100",
    "capacitor://localhost", // Added for Capacitor iOS
    "ionic://localhost", // Added for Ionic iOS
    "http://localhost:8080",
    "https://timely.mahermaker.me" // Replaced ngrok URL with Cloudflare URL
  ],
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/devices', deviceRoutes); // Add device routes

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket: Socket) => { // Socket type is from 'socket.io'
  // The socket here should already be authenticated by setupSocketAuth middleware
  // Cast to SocketWithAuth if your handleSocketConnection expects it and has populated userId/deviceId
  logger.info(`Socket connection established in app.ts: ${socket.id}`);
  handleSocketConnection(socket as SocketWithAuth); 
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'Internal server error' });
});

// Start the server
async function startServer() {
  try {
    // Initialize database
    await initDb();

    // Use the HTTP server to listen on all interfaces (0.0.0.0)
    server.listen(PORT as number, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}, accessible on the local network`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export the io instance if needed elsewhere, or create a dedicated module
export { io };
export default app;