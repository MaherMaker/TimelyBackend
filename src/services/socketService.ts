import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface SocketWithAuth extends Socket {
  userId?: number;
  deviceId?: string;
}

const userSockets = new Map<number, Set<string>>();
const socketUserMap = new Map<string, number>();

let configuredIoInstance: Server;

export function configureIoInstance(ioInstance: Server): void {
  configuredIoInstance = ioInstance;
  logger.info('SocketService: IO instance configured for emissions.');
}

export function setupSocketAuth(ioInstance: Server): void {
  ioInstance.use((socket: Socket, next: (err?: Error) => void) => {
    const tokenHeader = socket.handshake.auth.token as string | undefined;
    const token = tokenHeader?.startsWith('Bearer ') 
                  ? tokenHeader.substring(7) 
                  : tokenHeader;
    let deviceId = socket.handshake.query.deviceId as string;

    if (!token) {
      logger.warn(`Socket connection attempt without token: ${socket.id}`);
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { userId: number, deviceId?: string };
      (socket as SocketWithAuth).userId = decoded.userId;

      if (deviceId) {
        (socket as SocketWithAuth).deviceId = deviceId;
      } else if (decoded.deviceId) {
        (socket as SocketWithAuth).deviceId = decoded.deviceId;
        logger.info(`Socket ${socket.id} using deviceId from JWT token: ${decoded.deviceId}`);
      } else {
         logger.warn(`Socket connection attempt without deviceId in query or JWT for user ${decoded.userId}: ${socket.id}.`);
         return next(new Error('Authentication error: No deviceId provided'));
      }
      logger.info(`Socket token authenticated: ${socket.id}, UserID: ${decoded.userId}, DeviceID: ${(socket as SocketWithAuth).deviceId}`);
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${socket.id}`, { error: (err as Error).message });
      next(new Error('Authentication error: Invalid token'));
    }
  });
}

export function handleSocketConnection(socket: SocketWithAuth): void {
  const userId = socket.userId;
  const deviceId = socket.deviceId;

  if (!userId || !deviceId) {
    logger.error(`Socket connected without userId or deviceId after auth middleware: ${socket.id}. This should not happen.`);
    socket.disconnect(true);
    return;
  }

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)?.add(socket.id);
  socketUserMap.set(socket.id, userId);

  logger.info(`User ${userId} connected with socket ${socket.id} from device ${deviceId}. Total sockets for user: ${userSockets.get(userId)?.size}`);

  socket.on('disconnect', (reason: string) => {
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
      logger.info(`Socket disconnected: ${socket.id}, UserID: ${disconnectedUserId}, DeviceID: ${deviceId}, Reason: ${reason}. Remaining sockets for user: ${userSockets.get(disconnectedUserId)?.size ?? 0}`);
    } else {
      logger.warn(`Socket disconnected but no user mapping found: ${socket.id}, DeviceID: ${deviceId}`);
    }
  });

  socket.on('error', (error: Error) => {
    logger.error(`Socket error: ${socket.id}, UserID: ${userId}, DeviceID: ${deviceId}`, { error: error.message });
  });

  socket.on('my_event', (data: any) => {
    logger.info(`Received my_event from User ${userId}, Device ${deviceId}, Socket ${socket.id}:`, data);
    socket.emit('event_received', { message: 'Your event was received!', originalData: data });
  });
}

export function emitToUser(userId: number, event: string, data: any, originatingSocketId?: string) {
  if (!configuredIoInstance) {
    logger.warn('SocketService: IO instance (configuredIoInstance) is not configured. Cannot emit event.');
    return;
  }
  const targetSockets = userSockets.get(userId);
  if (targetSockets && targetSockets.size > 0) {
    let emittedCount = 0;
    targetSockets.forEach(socketId => {
      if (socketId !== originatingSocketId) {
        configuredIoInstance.to(socketId).emit(event, data);
        emittedCount++;
      }
    });
    if (emittedCount > 0) {
      logger.info(`Emitted event '${event}' to ${emittedCount} socket(s) for user ${userId}. Data: ${JSON.stringify(data)}. Originating socket ${originatingSocketId} was excluded.`);
    } else if (originatingSocketId && targetSockets.has(originatingSocketId) && targetSockets.size === 1) {
      logger.info(`Event '${event}' for user ${userId} not emitted as the only connected socket is the originating one (${originatingSocketId}).`);
    } else {
       logger.info(`Event '${event}' for user ${userId} not emitted. No suitable target sockets found excluding ${originatingSocketId}. User sockets: ${Array.from(targetSockets)}`);
    }
  } else {
    logger.info(`No active sockets found for user ${userId} to emit event '${event}'.`);
  }
}

export function emitToAll(event: string, data: any, originatingSocketId?: string) {
  if (!configuredIoInstance) {
    logger.warn('SocketService: IO instance (configuredIoInstance) is not configured. Cannot emit global event.');
    return;
  }
  if (originatingSocketId) {
    const allSocketIds = Array.from(socketUserMap.keys());
    allSocketIds.forEach(socketId => {
      if (socketId !== originatingSocketId) {
        configuredIoInstance.to(socketId).emit(event, data);
      }
    });
    logger.info(`Emitted global event '${event}' to all connected sockets, excluding ${originatingSocketId}.`);
  } else {
    configuredIoInstance.emit(event, data);
    logger.info(`Emitted global event '${event}' to all connected sockets.`);
  }
}

export function getSocketIdByUserId(userId: number): Set<string> | undefined {
    return userSockets.get(userId);
}

export function getUserIdBySocketId(socketId: string): number | undefined {
    return socketUserMap.get(socketId);
}

export function getConnectedUsers(): Map<number, number> {
    const connectedCounts = new Map<number, number>();
    userSockets.forEach((sockets, userId) => {
        connectedCounts.set(userId, sockets.size);
    });
    return connectedCounts;
}
