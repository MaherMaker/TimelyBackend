"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '86400'; // Default: 24 hours
class AuthService {
    async register(username, email, password) {
        try {
            // Check if username already exists
            const existingUsername = await User_1.default.findByUsername(username);
            if (existingUsername) {
                return {
                    success: false,
                    message: 'Username already taken'
                };
            }
            // Check if email already exists
            const existingEmail = await User_1.default.findByEmail(email);
            if (existingEmail) {
                return {
                    success: false,
                    message: 'Email already registered'
                };
            }
            // Create new user
            const newUser = {
                username,
                email,
                password
            };
            const userId = await User_1.default.create(newUser);
            // Generate token for auto-login
            const token = jsonwebtoken_1.default.sign({ userId, username }, JWT_SECRET, { expiresIn: parseInt(JWT_EXPIRATION) });
            return {
                success: true,
                message: 'User registered successfully',
                token,
                userId,
                username
            };
        }
        catch (error) {
            logger_1.default.error('Registration error', { error: error.message });
            return {
                success: false,
                message: 'Registration failed'
            };
        }
    }
    async login(usernameOrEmail, password) {
        try {
            // Check if input is email or username
            const isEmail = usernameOrEmail.includes('@');
            let user;
            if (isEmail) {
                user = await User_1.default.findByEmail(usernameOrEmail);
            }
            else {
                user = await User_1.default.findByUsername(usernameOrEmail);
            }
            // User not found
            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }
            // Validate password
            const isValidPassword = await User_1.default.validatePassword(user, password);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Invalid password'
                };
            }
            // Generate token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: parseInt(JWT_EXPIRATION) });
            return {
                success: true,
                message: 'Login successful',
                token,
                userId: user.id,
                username: user.username
            };
        }
        catch (error) {
            logger_1.default.error('Login error', { error: error.message });
            return {
                success: false,
                message: 'Login failed'
            };
        }
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return {
                valid: true,
                userId: decoded.userId,
                username: decoded.username
            };
        }
        catch (error) {
            logger_1.default.error('Token verification error', { error: error.message });
            return {
                valid: false
            };
        }
    }
}
exports.default = new AuthService();
//# sourceMappingURL=authService.js.map