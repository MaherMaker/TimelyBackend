import { Router } from 'express';
import authController from '../controllers/authController';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify', authController.verifyToken);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using a refresh token
 * @access  Public (requires a valid refresh token)
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user by revoking their refresh token
 * @access  Public (requires a valid refresh token)
 */
router.post('/logout', authController.logout);

export default router;