"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const authenticate = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Set user in request for use in other middleware or controllers
        req.user = {
            userId: decoded.userId,
            username: decoded.username
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error', { error: error.message });
        res.status(401).json({ message: 'Invalid or expired token' });
    }
    // Temporarily disabling authentication for testing
    // logger.warn('Authentication is temporarily disabled.');
    // next();
};
exports.authenticate = authenticate;
// Optional middleware to check if authenticated but doesn't reject if not
const optionalAuthenticate = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            username: decoded.username
        };
        next();
    }
    catch (error) {
        // Don't reject, just continue without authenticated user
        next();
    }
    // Temporarily disabling optional authentication for testing
    // logger.warn('Optional authentication is temporarily disabled.');
    // next();
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.js.map