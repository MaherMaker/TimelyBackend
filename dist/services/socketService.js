"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketService = initializeSocketService;
exports.emitToUser = emitToUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
// Map to store userId -> Set of socket IDs
const userSockets = new Map();
// Map to store socketId -> userId (for quick lookup on disconnect)
const socketUserMap = new Map();
function initializeSocketService(io) {
    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        let deviceId = socket.handshake.query.deviceId;
        if (!token) {
            logger_1.default.warn(`Socket connection attempt without token: ${socket.id}`);
            return next(new Error('Authentication error: No token provided'));
        }
        if (!deviceId) {
            logger_1.default.warn(`Socket connection attempt without deviceId: ${socket.id}.`);
            return next(new Error('Authentication error: No deviceId provided'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            socket.userId = decoded.userId;
            socket.deviceId = deviceId; // Store deviceId on the socket
            logger_1.default.info(`Socket authenticated: ${socket.id}, UserID: ${decoded.userId}, DeviceID: ${deviceId}`);
            next();
        }
        catch (err) {
            logger_1.default.warn(`Socket authentication failed: ${socket.id}`, { error: err.message });
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const authenticatedSocket = socket;
        const userId = authenticatedSocket.userId;
        const deviceId = authenticatedSocket.deviceId;
        if (!userId || !deviceId) {
            // Should not happen if middleware is effective, but handle defensively
            logger_1.default.error(`Socket connected without userId or deviceId after auth: ${socket.id}`);
            socket.disconnect(true);
            return;
        }
        // Add socket to user mapping
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)?.add(socket.id);
        socketUserMap.set(socket.id, userId);
        logger_1.default.info(`User ${userId} connected with socket ${socket.id} from device ${deviceId}. Total sockets for user: ${userSockets.get(userId)?.size}`);
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            const disconnectedUserId = socketUserMap.get(socket.id);
            if (disconnectedUserId) {
                const userSocketSet = userSockets.get(disconnectedUserId);
                if (userSocketSet) {
                    userSocketSet.delete(socket.id);
                    if (userSocketSet.size === 0) {
                        userSockets.delete(disconnectedUserId);
                    }
                }
                socketUserMap.delete(socket.id);
                logger_1.default.info(`Socket disconnected: ${socket.id}, UserID: ${disconnectedUserId}, Reason: ${reason}. Remaining sockets for user: ${userSockets.get(disconnectedUserId)?.size ?? 0}`);
            }
            else {
                // Should not happen if mapping is correct
                logger_1.default.warn(`Socket disconnected but no user mapping found: ${socket.id}`);
            }
        });
        socket.on('error', (error) => {
            logger_1.default.error(`Socket error: ${socket.id}, UserID: ${userId}`, { error: error.message });
        });
        // Example: Join a room based on userId to easily broadcast to all user's devices
        socket.join(`user_${userId}`);
        logger_1.default.debug(`Socket ${socket.id} joined room user_${userId}`);
    });
    logger_1.default.info('Socket.IO service initialized with authentication middleware.');
}
// Function to emit events to all sockets of a specific user, except potentially the sender
function emitToUser(userId, event, data, senderSocketId) {
    const targetRoom = `user_${userId}`;
    if (senderSocketId) {
        // Emit to the room, excluding the sender's socket ID
        app_1.io.to(targetRoom).except(senderSocketId).emit(event, data);
        logger_1.default.debug(`Emitted [${event}] to room ${targetRoom} (excluding ${senderSocketId})`, { data });
    }
    else {
        // Emit to everyone in the room
        app_1.io.to(targetRoom).emit(event, data);
        logger_1.default.debug(`Emitted [${event}] to room ${targetRoom}`, { data });
    }
}
// Need access to the io instance created in app.ts
// This is a slight simplification; dependency injection or a singleton pattern might be better
const app_1 = require("../app");
//# sourceMappingURL=socketService.js.map