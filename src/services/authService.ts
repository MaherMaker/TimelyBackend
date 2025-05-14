import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto'; // Added for generating secure random strings
import bcrypt from 'bcrypt'; // Added for hashing refresh token verifiers
import UserModel, { User } from '../models/User';
import RefreshTokenModel from '../models/RefreshToken'; // Added
import logger from '../utils/logger';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '3600'; // Changed to 1 hour for access token
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key'; // Added
const JWT_REFRESH_EXPIRATION = parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800'); // 7 days in seconds, Added

interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string; // Added
  userId?: number;
  username?: string;
}

// Added interface for new access token result
interface NewAccessTokenResult {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string; // For refresh token rotation
}

export class AuthService { // Added export keyword
  private async generateAndStoreRefreshToken(userId: number, deviceId?: string): Promise<string | null> {
    try {
      const selector = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      const hashedVerifier = await bcrypt.hash(verifier, 10);
      const expiresAt = new Date(Date.now() + JWT_REFRESH_EXPIRATION * 1000).toISOString();

      // Revoke existing tokens for the same user and device to prevent token buildup
      if (deviceId) {
        await RefreshTokenModel.revokeAllByUserIdAndDeviceId(userId, deviceId);
      }

      await RefreshTokenModel.create({
        user_id: userId,
        selector,
        hashed_verifier: hashedVerifier,
        device_id: deviceId,
        expires_at: expiresAt,
      });

      return `${selector}:${verifier}`;
    } catch (error) {
      logger.error('Error generating and storing refresh token', { error: (error as Error).message, userId, deviceId });
      return null;
    }
  }

  async register(username: string, email: string, password: string, deviceId?: string): Promise<AuthResult> { // Added deviceId
    try {
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        return {
          success: false,
          message: 'Username already taken'
        };
      }

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return {
          success: false,
          message: 'Email already registered'
        };
      }

      const newUser: User = {
        username,
        email,
        password
      };

      const userId = await UserModel.create(newUser);

      const payload: { userId: number; username: string; deviceId?: string } = { userId, username };
      if (deviceId) {
        payload.deviceId = deviceId;
      }

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: parseInt(JWT_EXPIRATION) }
      );

      const refreshToken = await this.generateAndStoreRefreshToken(userId, deviceId); // Pass deviceId
      if (!refreshToken) {
        logger.warn('User registered but refresh token generation failed', { userId });
      }

      return {
        success: true,
        message: 'User registered successfully',
        token,
        refreshToken: refreshToken || undefined, // Changed to handle null
        userId,
        username
      };
    } catch (error) {
      logger.error('Registration error', { error: (error as Error).message });
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  async login(usernameOrEmail: string, password: string, deviceId?: string): Promise<AuthResult> { // Added deviceId
    try {
      const isEmail = usernameOrEmail.includes('@');

      let user: User | null;
      if (isEmail) {
        user = await UserModel.findByEmail(usernameOrEmail);
      } else {
        user = await UserModel.findByUsername(usernameOrEmail);
      }

      if (!user || !user.id) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const isValidPassword = await UserModel.validatePassword(user, password);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }

      const payload: { userId: number; username: string; deviceId?: string } = { userId: user.id, username: user.username };
      if (deviceId) {
        payload.deviceId = deviceId;
      }

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: parseInt(JWT_EXPIRATION) }
      );

      const refreshToken = await this.generateAndStoreRefreshToken(user.id, deviceId);
      if (!refreshToken) {
        logger.error('Login successful but refresh token generation failed', { userId: user.id, deviceId });
        return {
          success: true,
          message: 'Login successful, but failed to generate refresh token',
          token,
          userId: user.id,
          username: user.username,
        };
      }

      return {
        success: true,
        message: 'Login successful',
        token,
        refreshToken: refreshToken || undefined, // Changed to handle null
        userId: user.id,
        username: user.username
      };
    } catch (error) {
      logger.error('Login error', { error: (error as Error).message });
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  async refreshAccessToken(incomingRefreshToken: string, deviceId?: string): Promise<NewAccessTokenResult> { // Added deviceId for consistency, though might use deviceId from stored token
    try {
      const parts = incomingRefreshToken.split(':');
      if (parts.length !== 2) {
        return { success: false, message: 'Invalid refresh token format' };
      }
      const [selector, verifier] = parts;

      const storedToken = await RefreshTokenModel.findBySelector(selector);

      if (!storedToken) {
        return { success: false, message: 'Refresh token not found' };
      }

      if (storedToken.revoked_at) {
        logger.warn('Attempt to use a revoked refresh token', { selector, userId: storedToken.user_id });
        await RefreshTokenModel.revokeAllByUserId(storedToken.user_id);
        return { success: false, message: 'Refresh token revoked' };
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        return { success: false, message: 'Refresh token expired' };
      }

      const isVerifierValid = await bcrypt.compare(verifier, storedToken.hashed_verifier);
      if (!isVerifierValid) {
        await RefreshTokenModel.revoke(storedToken.id!);
        logger.warn('Invalid verifier for refresh token', { selector, userId: storedToken.user_id });
        return { success: false, message: 'Invalid refresh token' };
      }

      const user = await UserModel.findById(storedToken.user_id);
      if (!user) {
        return { success: false, message: 'User not found for refresh token' };
      }

      // Use deviceId from the stored refresh token if available, otherwise fallback to passed deviceId
      const effectiveDeviceId = storedToken.device_id || deviceId;

      const payload: { userId: number; username: string; deviceId?: string } = { userId: user.id!, username: user.username };
      if (effectiveDeviceId) {
        payload.deviceId = effectiveDeviceId;
      }

      const newAccessToken = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: parseInt(JWT_EXPIRATION) }
      );

      // Refresh token rotation: Generate a new refresh token and revoke the old one.
      // Pass the effectiveDeviceId to ensure the new refresh token is associated with the correct device.
      await RefreshTokenModel.revoke(storedToken.id!);
      const newRefreshToken = await this.generateAndStoreRefreshToken(user.id!, effectiveDeviceId);

      if (!newRefreshToken) {
        logger.error('Failed to generate new refresh token during rotation', { userId: user.id });
        return {
          success: true,
          message: 'Access token refreshed, but failed to rotate refresh token',
          token: newAccessToken,
        };
      }

      return {
        success: true,
        message: 'Access token refreshed successfully',
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };

    } catch (error) {
      logger.error('Refresh token error', { error: (error as Error).message });
      return { success: false, message: 'Failed to refresh access token' };
    }
  }

  async revokeRefreshToken(incomingRefreshToken: string): Promise<{ success: boolean; message: string }> {
    try {
      const parts = incomingRefreshToken.split(':');
      if (parts.length !== 2) {
        return { success: false, message: 'Invalid refresh token format' };
      }
      const [selector, verifier] = parts;

      const storedToken = await RefreshTokenModel.findBySelector(selector);

      if (!storedToken) {
        return { success: false, message: 'Refresh token not found' };
      }

      await RefreshTokenModel.revoke(storedToken.id!);
      return { success: true, message: 'Refresh token revoked successfully' };
    } catch (error) {
      logger.error('Error revoking refresh token', { error: (error as Error).message });
      return { success: false, message: 'Failed to revoke refresh token' };
    }
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    try {
      await RefreshTokenModel.deleteExpiredTokens();
      logger.info('Successfully cleaned up expired refresh tokens.');
    } catch (error) {
      logger.error('Error cleaning up expired refresh tokens', { error: (error as Error).message });
    }
  }

  async verifyToken(token: string): Promise<{ valid: boolean; userId?: number; username?: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };

      return {
        valid: true,
        userId: decoded.userId,
        username: decoded.username
      };
    } catch (error) {
      return {
        valid: false
      };
    }
  }
}

export default new AuthService();