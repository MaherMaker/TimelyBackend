import { Request, Response } from 'express';
import authService from '../services/authService';
import logger from '../utils/logger';

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: username, email, password'
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }
      
      // Validate password strength
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
        return;
      }
      
      const result = await authService.register(username, email, password);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Registration controller error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, password, deviceId } = req.body; // Added deviceId
      
      // Validate required fields
      if (!usernameOrEmail || !password) {
        res.status(400).json({
          success: false,
          message: 'Username/email and password are required'
        });
        return;
      }
      
      // deviceId is optional, but if provided, it should be a string
      if (deviceId !== undefined && typeof deviceId !== 'string') {
        res.status(400).json({
            success: false,
            message: 'deviceId must be a string if provided'
        });
        return;
      }

      const result = await authService.login(usernameOrEmail, password, deviceId); // Pass deviceId
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        // Use 401 for authentication failures (e.g., user not found, invalid password)
        // Use 400 for bad requests (e.g., missing fields, though handled above)
        // result.message will contain the specific reason
        res.status(result.message === 'User not found' || result.message === 'Invalid password' ? 401 : 400).json(result);
      }
    } catch (error) {
      logger.error('Login controller error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token is required'
        });
        return;
      }
      
      const result = await authService.verifyToken(token);
      
      if (result.valid) {
        res.status(200).json({
          success: true,
          message: 'Token is valid',
          userId: result.userId,
          username: result.username
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      logger.error('Token verification controller error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, deviceId } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }
      
      // deviceId is optional for refresh, but if provided, it should be a string
      if (deviceId !== undefined && typeof deviceId !== 'string') {
        res.status(400).json({
            success: false,
            message: 'deviceId must be a string if provided'
        });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken, deviceId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        // Specific error messages from authService will determine the status code
        res.status(401).json(result); // 401 for any refresh token failure
      }
    } catch (error) {
      logger.error('Refresh token controller error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required for logout'
        });
        return;
      }

      const result = await authService.revokeRefreshToken(refreshToken);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result); // Or 500 if it was an internal error during revocation
      }
    } catch (error) {
      logger.error('Logout controller error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  }
}

export default new AuthController();