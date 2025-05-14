"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
var sqlite3 = require("sqlite3");
var sqlite_1 = require("sqlite");
var path = require("path");
var fs = require("fs");
var dotenv = require("dotenv");
dotenv.config();
var dbPath = process.env.DB_PATH || './data/database.sqlite';
var dbDir = path.dirname(dbPath);
// Ensure the database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
function getDbConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, sqlite_1.open)({
                        filename: dbPath,
                        driver: sqlite3.Database
                    })];
                case 1:
                    db = _a.sent();
                    // Enable foreign keys
                    return [4 /*yield*/, db.run('PRAGMA foreign_keys = ON')];
                case 2:
                    // Enable foreign keys
                    _a.sent();
                    return [2 /*return*/, db];
            }
        });
    });
}
var dbInstance = null;
function getDb() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!dbInstance) return [3 /*break*/, 2];
                    return [4 /*yield*/, getDbConnection()];
                case 1:
                    dbInstance = _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, dbInstance];
            }
        });
    });
}
function initDb() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    // Create users table
                    return [4 /*yield*/, db.exec("\n    CREATE TABLE IF NOT EXISTS users (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      username TEXT UNIQUE NOT NULL,\n      email TEXT UNIQUE NOT NULL,\n      password TEXT NOT NULL,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    )\n  ")];
                case 2:
                    // Create users table
                    _a.sent();
                    // Create devices table
                    return [4 /*yield*/, db.exec("\n    CREATE TABLE IF NOT EXISTS devices (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      user_id INTEGER NOT NULL,\n      device_id TEXT NOT NULL,\n      device_name TEXT NOT NULL,\n      last_sync TIMESTAMP,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,\n      UNIQUE (user_id, device_id)\n    )\n  ")];
                case 3:
                    // Create devices table
                    _a.sent();
                    // Create alarms table
                    return [4 /*yield*/, db.exec("\n    CREATE TABLE IF NOT EXISTS alarms (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      user_id INTEGER NOT NULL,\n      title TEXT NOT NULL,\n      time TEXT NOT NULL,\n      days TEXT NOT NULL,\n      sound TEXT,\n      vibration BOOLEAN DEFAULT 1,\n      snooze_interval INTEGER DEFAULT 5,\n      snooze_count INTEGER DEFAULT 3,\n      is_active BOOLEAN DEFAULT 1,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      device_id TEXT,\n      sync_status TEXT DEFAULT 'synced',\n      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n    )\n  ")];
                case 4:
                    // Create alarms table
                    _a.sent();
                    console.log('Database initialized successfully');
                    return [2 /*return*/];
            }
        });
    });
}
