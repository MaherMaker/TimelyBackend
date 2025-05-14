"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = process.env.NODE_ENV || 'development';
const logsDir = path_1.default.join(__dirname, '../../logs');
// Ensure logs directory exists
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path_1.default.join(logsDir, `${env}.log`);
/**
 * Simple logger utility for consistent logging throughout the application
 */
class Logger {
    info(message, meta) {
        this.log('INFO', message, meta);
    }
    warn(message, meta) {
        this.log('WARN', message, meta);
    }
    error(message, meta) {
        this.log('ERROR', message, meta);
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            this.log('DEBUG', message, meta);
        }
    }
    log(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        console.log(`[${timestamp}] [${level}] ${message}${metaStr}`);
    }
}
exports.default = new Logger();
//# sourceMappingURL=logger.js.map