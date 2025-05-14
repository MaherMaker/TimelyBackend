"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
class DeviceModel {
    async findByDeviceId(userId, deviceId) {
        const db = await (0, database_1.getDb)();
        const result = await db.get('SELECT * FROM devices WHERE user_id = ? AND device_id = ?', [userId, deviceId]);
        return result || null;
    }
    async findById(id) {
        const db = await (0, database_1.getDb)();
        const result = await db.get('SELECT * FROM devices WHERE id = ?', [id]);
        return result || null;
    }
    async findAllByUserId(userId) {
        const db = await (0, database_1.getDb)();
        return db.all('SELECT * FROM devices WHERE user_id = ?', [userId]);
    }
    async create(device) {
        const db = await (0, database_1.getDb)();
        const currentTime = new Date().toISOString();
        const result = await db.run('INSERT INTO devices (user_id, device_id, device_name, last_sync, created_at) VALUES (?, ?, ?, ?, ?)', [
            device.user_id,
            device.device_id,
            device.device_name,
            device.last_sync || currentTime, // Use provided or current time
            currentTime // Set created_at time
        ]);
        return result.lastID || 0;
    }
    // Expects partial object with snake_case properties to update
    async update(userId, deviceId, data) {
        const db = await (0, database_1.getDb)();
        const updates = [];
        const values = [];
        // Only allow updating specific fields like device_name and last_sync via this generic update
        if (data.device_name !== undefined) {
            updates.push('device_name = ?');
            values.push(data.device_name);
        }
        if (data.last_sync !== undefined) {
            updates.push('last_sync = ?');
            values.push(data.last_sync);
        }
        if (updates.length === 0) {
            logger_1.default.warn(`DeviceModel.update called with no valid fields for user ${userId}, device ${deviceId}`);
            return; // No valid fields to update
        }
        values.push(userId);
        values.push(deviceId);
        const sql = `UPDATE devices SET ${updates.join(', ')} WHERE user_id = ? AND device_id = ?`;
        await db.run(sql, values);
    }
    async updateLastSync(userId, deviceId) {
        const currentTime = new Date().toISOString();
        const db = await (0, database_1.getDb)();
        await db.run('UPDATE devices SET last_sync = ? WHERE user_id = ? AND device_id = ?', [currentTime, userId, deviceId]);
    }
    async delete(userId, deviceId) {
        const db = await (0, database_1.getDb)();
        await db.run('DELETE FROM devices WHERE user_id = ? AND device_id = ?', [userId, deviceId]);
    }
    async exists(userId, deviceId) {
        const device = await this.findByDeviceId(userId, deviceId);
        return device !== null;
    }
}
exports.default = new DeviceModel();
//# sourceMappingURL=Device.js.map