import { Request, Response } from 'express';
import alarmService from '../services/alarmService';
import logger from '../utils/logger';
import { Alarm } from '../models/Alarm';

class AlarmController {
  async createAlarm(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { userId, deviceId: tokenDeviceId } = req.user;
      const effectiveDeviceId = tokenDeviceId || req.body.deviceId;
      const socketId = req.headers['x-socket-id'] as string | undefined;

      const alarmData: Alarm = {
        ...req.body,
        userId: userId,
        deviceId: effectiveDeviceId
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

      logger.debug(`Alarm creation request for user: ${userId}, device: ${effectiveDeviceId}, socket: ${socketId}`);
      const result = await alarmService.createAlarm(alarmData, socketId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Create alarm error', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateAlarm(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { userId } = req.user;
      const { id } = req.params;
      const socketId = req.headers['x-socket-id'] as string | undefined;
      const alarmData: Partial<Alarm> = req.body;

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

      logger.debug(`Alarm update request for alarm: ${alarmId}, user: ${userId}, socket: ${socketId}`);
      const result = await alarmService.updateAlarm(alarmId, userId, alarmData, socketId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
      }
    } catch (error) {
      logger.error('Update alarm error', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async deleteAlarm(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { userId } = req.user;
      const { id } = req.params;
      const socketId = req.headers['x-socket-id'] as string | undefined;

      // Validate alarm ID
      const alarmId = parseInt(id);
      if (isNaN(alarmId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid alarm ID'
        });
        return;
      }

      logger.debug(`Alarm deletion request for alarm: ${alarmId}, user: ${userId}, socket: ${socketId}`);
      const result = await alarmService.deleteAlarm(alarmId, userId, socketId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
      }
    } catch (error) {
      logger.error('Delete alarm error', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getAlarm(req: Request, res: Response): Promise<void> {
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

      const result = await alarmService.getAlarm(alarmId, userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
      }
    } catch (error) {
      logger.error('Get alarm error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getAllAlarms(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { userId } = req.user;
      const result = await alarmService.getAllAlarms(userId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Get all alarms error', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { userId } = req.user;
      const { id } = req.params;
      const { isActive } = req.body;
      const socketId = req.headers['x-socket-id'] as string | undefined;

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

      logger.debug(`Alarm toggle request for alarm: ${alarmId}, user: ${userId}, isActive: ${isActive}, socket: ${socketId}`);
      const result = await alarmService.toggleAlarmActive(alarmId, userId, isActive, socketId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.message === 'Alarm not found' ? 404 : 400).json(result);
      }
    } catch (error) {
      logger.error('Toggle alarm active error', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async syncAlarms(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      let { userId, deviceId } = req.user as { userId: number; deviceId?: string };
      const { alarms, deviceId: bodyDeviceId } = req.body;
      const socketId = req.headers['x-socket-id'] as string | undefined;

      if (!deviceId && bodyDeviceId) {
        deviceId = bodyDeviceId;
      }

      if (!deviceId) {
        res.status(400).json({
          success: false,
          message: 'Device ID is required (from token or request body)'
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

      logger.debug(`Sync alarms request for user: ${userId}, device: ${deviceId}, socket: ${socketId}, clientAlarms count: ${alarms.length}`);
      const result = await alarmService.syncAlarms(userId, deviceId, alarms, socketId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Sync alarms error', { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new AlarmController();