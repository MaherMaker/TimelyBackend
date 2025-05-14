"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = __importDefault(require("../controllers/authController"));
const router = (0, express_1.Router)();
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController_1.default.register);
/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', authController_1.default.login);
/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify', authController_1.default.verifyToken);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map