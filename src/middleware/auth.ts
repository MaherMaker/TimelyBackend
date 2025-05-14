import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

interface TokenPayload {
  userId: number;
  username: string;
  deviceId: string; // Added deviceId
  iat: number;
  exp: number;
}

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        deviceId: string; // Added deviceId
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: 'Invalid authentication token format' });
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Set user in request for use in other middleware or controllers
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      deviceId: decoded.deviceId // Added deviceId
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error', { error: (error as Error).message });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Optional middleware to check if authenticated but doesn't reject if not
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      next();
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      deviceId: decoded.deviceId // Added deviceId
    };
    
    next();
  } catch (error) {
    // Don't reject, just continue without authenticated user
    next();
  }
};