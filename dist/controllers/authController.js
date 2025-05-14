"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authService_1 = __importDefault(require("../services/authService"));
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    async register(req, res) {
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
            const result = await authService_1.default.register(username, email, password);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Registration controller error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async login(req, res) {
        try {
            const { usernameOrEmail, password } = req.body;
            // Validate required fields
            if (!usernameOrEmail || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Username/email and password are required'
                });
                return;
            }
            const result = await authService_1.default.login(usernameOrEmail, password);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(401).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Login controller error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async verifyToken(req, res) {
        try {
            const { token } = req.body;
            if (!token) {
                res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
                return;
            }
            const result = await authService_1.default.verifyToken(token);
            if (result.valid) {
                res.status(200).json({
                    success: true,
                    message: 'Token is valid',
                    userId: result.userId,
                    username: result.username
                });
            }
            else {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        }
        catch (error) {
            logger_1.default.error('Token verification controller error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.default = new AuthController();
//# sourceMappingURL=authController.js.map