import request from 'supertest';
import app from '../../app'; // Assuming your Express app is exported from app.ts
import UserModel from '../../models/User';
import RefreshTokenModel from '../../models/RefreshToken';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the models
jest.mock('../../models/User');
jest.mock('../../models/RefreshToken');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));


describe('Auth API Endpoints', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return tokens', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue(1); // Mock successful user creation returning a user ID
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (secret === (process.env.JWT_SECRET || 'default_secret_key')) return 'mockAccessToken';
        return 'mockToken'; // Fallback, though not expected for this flow
      });
      // Mock the internal call to generateAndStoreRefreshToken
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedVerifier'); // For refresh token verifier
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({} as any); // Mock refresh token creation
      (RefreshTokenModel.revokeAllByUserIdAndDeviceId as jest.Mock).mockResolvedValue(undefined);


      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBe('mockAccessToken');
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.userId).toBe(1);
      expect(UserModel.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123', // Controller passes raw password to service
      });
    });

    it('should return 400 if username is already taken', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue({ id: 1, username: 'existinguser' });
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'test@example.com',
          password: 'password123',
        });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username already taken');
    });

    it('should return 400 if email is already registered', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({ id: 1, email: 'existing@example.com' });
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123',
        });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });

    it('should return 400 for invalid registration payload (e.g., missing fields)', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                // email is missing
                password: 'password123',
            });
        expect(response.status).toBe(400);
        // Check for the specific message from the controller
        expect(response.body.message).toBe('All fields are required: username, email, password');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user successfully and return tokens', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', password: 'hashedpassword' };
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.validatePassword as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (secret === (process.env.JWT_SECRET || 'default_secret_key')) return 'mockAccessToken';
        return 'mockToken';
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedVerifier');
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue({} as any);
      (RefreshTokenModel.revokeAllByUserIdAndDeviceId as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'test@example.com', // Changed from email to usernameOrEmail
          password: 'password123',
          deviceId: 'testDevice',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBe('mockAccessToken');
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.userId).toBe(mockUser.id);
    });

    it('should return 401 if user not found', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'nonexistent@example.com', // Changed from email to usernameOrEmail
          password: 'password123',
        });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashedpassword' };
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser); // Assuming login via email
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null); // Ensure findByUsername is also considered if logic changes
      (UserModel.validatePassword as jest.Mock).mockResolvedValue(false);
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'test@example.com', // Changed from email to usernameOrEmail
          password: 'wrongpassword',
        });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should return 400 for invalid login payload (e.g., missing fields)', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                // usernameOrEmail is missing
                password: 'password123',
            });
        expect(response.status).toBe(400);
        // Check for the specific message from the controller
        expect(response.body.message).toBe('Username/email and password are required');
    });
  });

  // TODO: Add tests for /api/auth/refresh-token
  // TODO: Add tests for /api/auth/logout (if implemented and requires specific logic)
});
