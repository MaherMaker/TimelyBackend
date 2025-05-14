"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http")); // Import http module
const socket_io_1 = require("socket.io"); // Import Socket.IO Server
const database_1 = require("./config/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const alarmRoutes_1 = __importDefault(require("./routes/alarmRoutes"));
const logger_1 = __importDefault(require("./utils/logger"));
// Load environment variables
dotenv_1.default.config();
// Initialize the Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize Socket.IO server
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:4200", // Allow specific origin
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)({
    origin: "http://localhost:4200" // Allow specific origin
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next();
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/alarms', alarmRoutes_1.default);
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Socket.IO connection handling
io.on('connection', (socket) => {
    logger_1.default.info(`Socket connected: ${socket.id}`);
    // TODO: Implement authentication and user/device mapping
    socket.on('disconnect', (reason) => {
        logger_1.default.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
        // TODO: Remove socket from user mapping
    });
    socket.on('error', (error) => {
        logger_1.default.error(`Socket error: ${socket.id}`, { error: error.message });
    });
});
// 404 handler
app.use((req, res) => {
    logger_1.default.warn(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ message: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
    logger_1.default.error('Server error', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Internal server error' });
});
// Start the server
async function startServer() {
    try {
        // Initialize database
        await (0, database_1.initDb)();
        // Use the HTTP server to listen on all interfaces (0.0.0.0)
        server.listen(PORT, '0.0.0.0', () => {
            logger_1.default.info(`Server running on port ${PORT}, accessible on the local network`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map