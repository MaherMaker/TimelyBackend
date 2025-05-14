import { AuthService } from '../authService'; // Changed import to named import
import UserModel from '../../models/User'; // Import the default export
import RefreshTokenModel from '../../models/RefreshToken'; // Import the default export
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // Changed from bcryptjs

// Mock dependencies
jest.mock('../../models/User'); 
jest.mock('../../models/RefreshToken');
jest.mock('jsonwebtoken');
jest.mock('bcrypt'); // Changed from bcryptjs

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => { // Changed to match method name
    it('should register a new user successfully', async () => {
      const mockUserSave = jest.fn().mockResolvedValue(true);
      // Ensure mockUserInstance matches the structure expected by the service
      const mockUserInstance = { id: 1, username: 'testuser', email: 'test@example.com', password: 'hashedpassword', save: mockUserSave }; 
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword'); // This is for the service, not model
      (UserModel.create as jest.Mock).mockResolvedValue(1); // Assuming create returns userId
      (jwt.sign as jest.Mock).mockReturnValue('mockAccessToken');
      // Mock generateAndStoreRefreshToken if it's called directly or indirectly
      // For simplicity, assuming it returns a mock token or is handled by RefreshTokenModel mock
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({} as any); // Mock RefreshTokenModel.create
      (RefreshTokenModel.revokeAllByUserIdAndDeviceId as jest.Mock).mockResolvedValue(undefined);


      const result = await authService.register('testuser', 'test@example.com', 'password123');

      expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(UserModel.findByUsername).toHaveBeenCalledWith('testuser');
      expect(UserModel.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123', // Password before hashing, service handles hashing
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(RefreshTokenModel.create).toHaveBeenCalled(); // Verify refresh token creation
      expect(result.success).toBe(true);
      expect(result.token).toBe('mockAccessToken');
      expect(result.userId).toBe(1);
    });

    it('should return error if email is already registered', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({ id: 1, email: 'test@example.com' });
      const result = await authService.register('testuser', 'test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already registered');
    });

    it('should return error if username is already taken', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.findByUsername as jest.Mock).mockResolvedValue({ id: 1, username: 'testuser' });
      const result = await authService.register('testuser', 'test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Username already taken');
    });
  });

  describe('login', () => { // Changed to match method name
    it('should login an existing user and return tokens', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', password: 'hashedpassword' }; 
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.validatePassword as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mockAccessToken');
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({} as any); // Mock RefreshTokenModel.create
      (RefreshTokenModel.revokeAllByUserIdAndDeviceId as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.login('test@example.com', 'password123', 'testDevice');

      expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(UserModel.validatePassword).toHaveBeenCalledWith(mockUser, 'password123');
      expect(jwt.sign).toHaveBeenCalled();
      expect(RefreshTokenModel.create).toHaveBeenCalled(); // Verify refresh token creation
      expect(result.success).toBe(true);
      expect(result.token).toBe('mockAccessToken');
      expect(result.userId).toBe(mockUser.id);
    });

    it('should return error if user not found', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      const result = await authService.login('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('should return error for invalid password', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashedpassword' };
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.validatePassword as jest.Mock).mockResolvedValue(false);
      const result = await authService.login('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid password');
    });
  });

  describe('refreshAccessToken', () => {
    it('should return a new access token if refresh token is valid', async () => {
      const mockStoredToken = { id: 1, user_id: 1, selector: 'selector', hashed_verifier: 'hashedVerifier', expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: null }; 
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('newMockAccessToken');
      (RefreshTokenModel.revoke as jest.Mock).mockResolvedValue(undefined);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({} as any); // Mock new refresh token creation
      (RefreshTokenModel.revokeAllByUserIdAndDeviceId as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.refreshAccessToken('selector:verifier', 'testDevice');

      expect(RefreshTokenModel.findBySelector).toHaveBeenCalledWith('selector');
      expect(bcrypt.compare).toHaveBeenCalledWith('verifier', 'hashedVerifier');
      expect(UserModel.findById).toHaveBeenCalledWith(mockStoredToken.user_id);
      // Use the same logic as in the service to determine expected expiresIn
      const expectedExpiresIn = parseInt(process.env.JWT_EXPIRATION || '3600');
      expect(jwt.sign).toHaveBeenCalledWith({ userId: mockUser.id, username: mockUser.username }, process.env.JWT_SECRET || 'default_secret_key', { expiresIn: expectedExpiresIn });
      expect(RefreshTokenModel.revoke).toHaveBeenCalledWith(mockStoredToken.id);
      expect(RefreshTokenModel.create).toHaveBeenCalled(); // New refresh token created
      expect(result.success).toBe(true);
      expect(result.token).toBe('newMockAccessToken');
      expect(result.refreshToken).toBeDefined();
    });

    it('should return error if refresh token format is invalid', async () => {
      const result = await authService.refreshAccessToken('invalidtokenformat');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid refresh token format');
    });

    it('should return error if refresh token not found', async () => {
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(null);
      const result = await authService.refreshAccessToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token not found');
    });
    
    it('should return error if refresh token is revoked', async () => {
      const mockStoredToken = { id: 1, user_id: 1, selector: 'selector', hashed_verifier: 'hashedVerifier', expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: new Date().toISOString() }; 
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      const result = await authService.refreshAccessToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token revoked');
      expect(RefreshTokenModel.revokeAllByUserId).toHaveBeenCalledWith(mockStoredToken.user_id);
    });

    it('should return error if refresh token is expired', async () => {
      const mockStoredToken = { id: 1, user_id: 1, selector: 'selector', hashed_verifier: 'hashedVerifier', expires_at: new Date(Date.now() - 3600000).toISOString(), revoked_at: null }; 
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      const result = await authService.refreshAccessToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token expired');
    });

    it('should return error if verifier is invalid', async () => {
      const mockStoredToken = { id: 1, user_id: 1, selector: 'selector', hashed_verifier: 'hashedVerifier', expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: null }; 
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await authService.refreshAccessToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid refresh token');
      expect(RefreshTokenModel.revoke).toHaveBeenCalledWith(mockStoredToken.id);
    });

    it('should return error if user not found for refresh token', async () => {
      const mockStoredToken = { id: 1, user_id: 1, selector: 'selector', hashed_verifier: 'hashedVerifier', expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: null }; 
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (UserModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await authService.refreshAccessToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found for refresh token');
    });

  });

  describe('revokeRefreshToken', () => {
    it('should revoke the refresh token', async () => {
      const mockStoredToken = { id: 1, selector: 'selector' };
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(mockStoredToken);
      (RefreshTokenModel.revoke as jest.Mock).mockResolvedValue(1);
      const result = await authService.revokeRefreshToken('selector:verifier');
      expect(RefreshTokenModel.findBySelector).toHaveBeenCalledWith('selector');
      expect(RefreshTokenModel.revoke).toHaveBeenCalledWith(mockStoredToken.id);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Refresh token revoked successfully');
    });

    it('should return error if token format is invalid', async () => {
      const result = await authService.revokeRefreshToken('invalidformat');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid refresh token format');
    });

    it('should return error if token not found', async () => {
      (RefreshTokenModel.findBySelector as jest.Mock).mockResolvedValue(null);
      const result = await authService.revokeRefreshToken('selector:verifier');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token not found');
    });
  });

  describe('verifyToken', () => {
    it('should return valid and decoded user info for a valid token', async () => {
      const mockDecoded = { userId: 1, username: 'testuser' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      const result = await authService.verifyToken('validtoken');
      expect(jwt.verify).toHaveBeenCalledWith('validtoken', process.env.JWT_SECRET || 'default_secret_key');
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(mockDecoded.userId);
      expect(result.username).toBe(mockDecoded.username);
    });

    it('should return invalid for an invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid token'); });
      const result = await authService.verifyToken('invalidtoken');
      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
      expect(result.username).toBeUndefined();
    });
  });

});
