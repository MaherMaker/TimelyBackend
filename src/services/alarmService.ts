import AlarmModel, { Alarm } from '../models/Alarm';
import DeviceModel, { Device } from '../models/Device'; // Corrected import
import logger from '../utils/logger';
import { emitToUser } from './socketService';
// Updated import to include sendPushNotification
import { sendDataNotification, sendPushNotification } from './notificationService';

interface AlarmOperationResult {
  success: boolean;
  message: string;
  alarm?: Alarm;
  alarms?: Alarm[];
  id?: number;
}

class AlarmService {
  private async notifyOtherDevices(userId: number, operation: string, entityId: number, excludeDeviceId?: string) { // entityId is now number
    try {
      const devices = await DeviceModel.findAllByUserId(userId); // Use DeviceModel instance method
      for (const device of devices) {
        if (device.fcm_token && device.device_id !== excludeDeviceId) {
          logger.info(`Notifying device ${device.device_id} for user ${userId} about ${operation} on entity ${entityId}`);
          // Changed from sendDataNotification to sendPushNotification
          await sendPushNotification({
            token: device.fcm_token,
            title: 'Timely Sync',
            body: 'Alarms have been updated.', // Generic body
            data: {
              type: 'ALARM_SYNC_REQUEST',
              operation: operation,
              entityId: String(entityId),
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error sending data notifications to other devices', { userId, operation, entityId, error: (error as Error).message });
    }
  }

  async createAlarm(alarm: Alarm, senderSocketId?: string, senderDeviceId?: string): Promise<AlarmOperationResult> {
    try {
      const alarmDataForDb = {
        ...alarm,
        days: Array.isArray(alarm.days) ? JSON.stringify(alarm.days) : alarm.days
      };
      const alarmId = await AlarmModel.create(alarmDataForDb);

      if (alarmId) {
        const newAlarm = await AlarmModel.findById(alarmId, alarm.userId);
        if (newAlarm && typeof newAlarm.id === 'number') { // Check newAlarm and its id
          logger.info(`Alarm created: ${newAlarm.id} by user ${alarm.userId}. Emitting to user, excluding socket: ${senderSocketId}`);
          emitToUser(alarm.userId, 'alarm_created', newAlarm, senderSocketId);
          this.notifyOtherDevices(alarm.userId, 'create', newAlarm.id, senderDeviceId);
        }
        return {
          success: true,
          message: 'Alarm created successfully',
          alarm: newAlarm || undefined,
          id: alarmId
        };
      } else {
        return {
          success: false,
          message: 'Failed to create alarm'
        };
      }
    } catch (error) {
      logger.error('Error creating alarm in service', { error: (error as Error).message, userId: alarm.userId });
      return {
        success: false,
        message: 'Error creating alarm'
      };
    }
  }

  async updateAlarm(id: number, userId: number, data: Partial<Alarm>, senderSocketId?: string, senderDeviceId?: string): Promise<AlarmOperationResult> {
    try {
      const existingAlarm = await AlarmModel.findById(id, userId);

      if (!existingAlarm) {
        return {
          success: false,
          message: 'Alarm not found'
        };
      }

      const updateDataForDb = {
        ...data,
        days: data.days && Array.isArray(data.days) ? JSON.stringify(data.days) : data.days
      };

      await AlarmModel.update(id, userId, updateDataForDb);

      const updatedAlarm = await AlarmModel.findById(id, userId);
      if (updatedAlarm && typeof updatedAlarm.id === 'number') { // Check updatedAlarm and its id
        logger.info(`Alarm updated: ${updatedAlarm.id} by user ${userId}. Emitting to user, excluding socket: ${senderSocketId}`);
        emitToUser(userId, 'alarm_updated', updatedAlarm, senderSocketId);
        this.notifyOtherDevices(userId, 'update', updatedAlarm.id, senderDeviceId);
      }

      return {
        success: true,
        message: 'Alarm updated successfully',
        alarm: updatedAlarm || undefined
      };
    } catch (error) {
      logger.error('Error updating alarm in service', { error: (error as Error).message, alarmId: id, userId });
      return {
        success: false,
        message: 'Error updating alarm'
      };
    }
  }

  async deleteAlarm(id: number, userId: number, senderSocketId?: string, senderDeviceId?: string): Promise<AlarmOperationResult> {
    try {
      const alarm = await AlarmModel.findById(id, userId);

      if (!alarm) {
        return {
          success: false,
          message: 'Alarm not found'
        };
      }

      await AlarmModel.delete(id, userId);

      logger.info(`Alarm deleted: ${id} by user ${userId}. Emitting to user, excluding socket: ${senderSocketId}`);
      emitToUser(userId, 'alarm_deleted', { id }, senderSocketId);
      this.notifyOtherDevices(userId, 'delete', id, senderDeviceId); // id is already a number here

      return {
        success: true,
        message: 'Alarm deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting alarm in service', { error: (error as Error).message, alarmId: id, userId });
      return {
        success: false,
        message: 'Error deleting alarm'
      };
    }
  }

  async getAlarm(id: number, userId: number): Promise<AlarmOperationResult> {
    try {
      const alarm = await AlarmModel.findById(id, userId);

      if (!alarm) {
        return {
          success: false,
          message: 'Alarm not found'
        };
      }

      return {
        success: true,
        message: 'Alarm retrieved successfully',
        alarm
      };
    } catch (error) {
      logger.error('Error retrieving alarm', { error: (error as Error).message });
      return {
        success: false,
        message: 'Error retrieving alarm'
      };
    }
  }

  async getAllAlarms(userId: number): Promise<AlarmOperationResult> {
    try {
      const alarms = await AlarmModel.findAllByUserId(userId);

      return {
        success: true,
        message: 'Alarms retrieved successfully',
        alarms
      };
    } catch (error) {
      logger.error('Error retrieving alarms', { error: (error as Error).message });
      return {
        success: false,
        message: 'Error retrieving alarms'
      };
    }
  }

  async toggleAlarmActive(id: number, userId: number, isActive: boolean, senderSocketId?: string, senderDeviceId?: string): Promise<AlarmOperationResult> {
    try {
      const alarm = await AlarmModel.findById(id, userId);

      if (!alarm) {
        return {
          success: false,
          message: 'Alarm not found'
        };
      }

      await AlarmModel.toggleActive(id, userId, isActive);

      const updatedAlarm = await AlarmModel.findById(id, userId);
      if (updatedAlarm && typeof updatedAlarm.id === 'number') { // Check updatedAlarm and its id
        logger.info(`Alarm toggled: ${updatedAlarm.id} to ${isActive} by user ${userId}. Emitting to user, excluding socket: ${senderSocketId}`);
        emitToUser(userId, 'alarm_updated', updatedAlarm, senderSocketId);
        this.notifyOtherDevices(userId, 'toggle', updatedAlarm.id, senderDeviceId);
      }

      return {
        success: true,
        message: `Alarm ${isActive ? 'activated' : 'deactivated'} successfully`,
        alarm: updatedAlarm || undefined
      };
    } catch (error) {
      logger.error('Error toggling alarm active state in service', { error: (error as Error).message, alarmId: id, userId });
      return {
        success: false,
        message: 'Error toggling alarm active state'
      };
    }
  }

  async syncAlarms(
    userId: number,
    deviceId: string,
    clientAlarms: Alarm[],
    senderSocketId?: string
  ): Promise<AlarmOperationResult> {
    const syncStartTime = new Date();
    let lastSyncTimestamp: string | null | undefined; 

    try {
      logger.info(`Sync starting for user ${userId}, device ${deviceId}, socket ${senderSocketId}. Client alarms count: ${clientAlarms.length}`);

      // Attempt to get or create the device using the upsert logic in DeviceModel.create
      // DeviceModel.create will handle finding an existing device or creating a new one.
      const device = await DeviceModel.create({
        user_id: userId,
        device_id: deviceId,
        device_name: `Device ${deviceId.substring(0, 6)}` // Default name, create will handle if it exists/updates
        // Note: fcm_token is not passed here. DeviceModel.create should preserve existing fcm_token if the device exists.
      });

      if (!device) {
        // DeviceModel.create returned undefined, meaning it failed to create or find/update the device.
        logger.error('DeviceModel.create failed to return a device during sync.', { userId, deviceId });
        // Return a more specific message to help pinpoint the issue.
        return { success: false, message: 'Failed to register or update device. Please check server logs for details from DeviceModel.' };
      }

      // Now 'device' holds the device object from the DB (either existing or newly created/updated).
      lastSyncTimestamp = device.last_sync; 
      if (lastSyncTimestamp === null || lastSyncTimestamp === undefined) {
        logger.warn(`Device ${deviceId} for user ${userId} has null or undefined last_sync. Using epoch.`);
        lastSyncTimestamp = new Date(0).toISOString();
      }
      
      logger.info(`User ${userId}, device ${deviceId}. Last sync timestamp: ${lastSyncTimestamp}`);

      const processedClientIds = new Set<number>();

      for (const clientAlarm of clientAlarms) {
        const alarmData: Partial<Alarm> = {
          ...clientAlarm,
          userId: userId,
          deviceId: deviceId,
          syncStatus: 'synced',
          days: Array.isArray(clientAlarm.days) ? JSON.stringify(clientAlarm.days) : clientAlarm.days,
        };

        try {
          if (clientAlarm.id) {
            const existingServerAlarm = await AlarmModel.findById(clientAlarm.id, userId);
            processedClientIds.add(clientAlarm.id);

            if (existingServerAlarm) {
              await AlarmModel.update(clientAlarm.id, userId, alarmData);
            } else {
              delete alarmData.id;
              await AlarmModel.create(alarmData as Alarm);
            }
          } else {
            await AlarmModel.create(alarmData as Alarm);
          }
        } catch (processingError) {
          logger.error('Error processing client alarm during sync', { userId, deviceId, alarmId: clientAlarm.id, error: (processingError as Error).message });
        }
      }

      const serverChanges = await AlarmModel.getAlarmsForSync(userId, lastSyncTimestamp);
      logger.info(`Found ${serverChanges.length} server changes since ${lastSyncTimestamp} for user ${userId} to send to device ${deviceId}`);

      // Update last_sync timestamp on the device record
      await DeviceModel.update(userId, deviceId, { last_sync: syncStartTime.toISOString() });
      logger.info(`Updated last_sync for user ${userId}, device ${deviceId} to ${syncStartTime.toISOString()}`);

      return {
        success: true,
        message: 'Sync completed successfully',
        alarms: serverChanges
      };

    } catch (error) {
      logger.error('Critical error during alarm sync', { userId, deviceId, error: (error as Error).message, stack: (error as Error).stack });
      return {
        success: false,
        message: 'Error syncing alarms'
      };
    }
  }
}

export { AlarmService };
export default new AlarmService();