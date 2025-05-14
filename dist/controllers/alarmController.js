"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const alarmService_1 = __importDefault(require("../services/alarmService"));
const logger_1 = __importDefault(require("../utils/logger"));
class AlarmController {
    async createAlarm(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const alarmData = {
                ...req.body,
                userId: userId
            };
            // Validate required fields
            if (!alarmData.title || !alarmData.time || !alarmData.days) {
                res.status(400).json({
                    success: false,
                    message: 'Required fields missing: title, time, days'
                });
                return;
            }
            // Validate time format (HH:MM)
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(alarmData.time)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid time format. Use HH:MM (24-hour format)'
                });
                return;
            }
            // Validate days format (array of integers)
            if (!Array.isArray(alarmData.days) || alarmData.days.some(day => day < 0 || day > 6)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid days format. Use an array of days (0-6, where 0 is Sunday)'
                });
                return;
            }
            const result = await alarmService_1.default.createAlarm(alarmData);
            if (result.success) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Create alarm error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async updateAlarm(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const { id } = req.params;
            const alarmData = req.body;
            // Validate alarm ID
            const alarmId = parseInt(id);
            if (isNaN(alarmId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid alarm ID'
                });
                return;
            }
            // Validate time format if provided
            if (alarmData.time) {
                const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                if (!timeRegex.test(alarmData.time)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid time format. Use HH:MM (24-hour format)'
                    });
                    return;
                }
            }
            // Validate days format if provided
            if (alarmData.days) {
                if (!Array.isArray(alarmData.days) || alarmData.days.some(day => day < 0 || day > 6)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid days format. Use an array of days (0-6, where 0 is Sunday)'
                    });
                    return;
                }
            }
            const result = await alarmService_1.default.updateAlarm(alarmId, userId, alarmData);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Update alarm error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async deleteAlarm(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const { id } = req.params;
            // Validate alarm ID
            const alarmId = parseInt(id);
            if (isNaN(alarmId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid alarm ID'
                });
                return;
            }
            const result = await alarmService_1.default.deleteAlarm(alarmId, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Delete alarm error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getAlarm(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const { id } = req.params;
            // Validate alarm ID
            const alarmId = parseInt(id);
            if (isNaN(alarmId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid alarm ID'
                });
                return;
            }
            const result = await alarmService_1.default.getAlarm(alarmId, userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Get alarm error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getAllAlarms(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const result = await alarmService_1.default.getAllAlarms(userId);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Get all alarms error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async toggleActive(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const { id } = req.params;
            const { isActive } = req.body;
            // Validate alarm ID
            const alarmId = parseInt(id);
            if (isNaN(alarmId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid alarm ID'
                });
                return;
            }
            // Validate active parameter
            if (isActive === undefined || typeof isActive !== 'boolean') {
                res.status(400).json({
                    success: false,
                    message: 'Active status must be a boolean value'
                });
                return;
            }
            const result = await alarmService_1.default.toggleAlarmActive(alarmId, userId, isActive);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Toggle alarm active error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async syncAlarms(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'User not authenticated' });
                return;
            }
            const { userId } = req.user;
            const { deviceId, alarms } = req.body;
            if (!deviceId) {
                res.status(400).json({
                    success: false,
                    message: 'Device ID is required'
                });
                return;
            }
            if (!alarms || !Array.isArray(alarms)) {
                res.status(400).json({
                    success: false,
                    message: 'Alarms must be provided as an array'
                });
                return;
            }
            const result = await alarmService_1.default.syncAlarms(userId, deviceId, alarms);
            if (result.success) {
                res.status(200).json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            logger_1.default.error('Sync alarms error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.default = new AlarmController();
//# sourceMappingURL=alarmController.js.map