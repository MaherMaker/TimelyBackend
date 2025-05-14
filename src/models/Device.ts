import { getDb } from '../config/database';
import logger from '../utils/logger';

export interface Device {
  id?: number;
  user_id: number;
  device_id: string;
  device_name: string;
  last_sync?: string | null; // ISO 8601 date string
  fcm_token?: string | null; // Firebase Cloud Messaging token
  created_at?: string; // ISO 8601 date string
  updated_at?: string; // ISO 8601 date string
}

class DeviceModel {
  async findByDeviceId(userId: number, deviceId: string): Promise<Device | null> {
    const db = await getDb();
    const result = await db.get<Device>(
      'SELECT * FROM devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    return result || null;
  }

  async findById(id: number): Promise<Device | null> {
    const db = await getDb();
    const result = await db.get<Device>('SELECT * FROM devices WHERE id = ?', [id]);
    return result || null;
  }

  async findAllByUserId(userId: number): Promise<Device[]> {
    const db = await getDb();
    return db.all<Device[]>(
      'SELECT id, user_id, device_id, device_name, last_sync, fcm_token, created_at, updated_at FROM devices WHERE user_id = ?',
      [userId]
    );
  }

  async create(device: Omit<Device, 'id' | 'created_at' | 'last_sync' | 'updated_at'>): Promise<Device> {
    const db = await getDb();
    const { user_id, device_id, device_name, fcm_token } = device; // fcm_token can be undefined
    
    logger.debug(`DeviceModel.create called for user_id: ${user_id}, device_id: ${device_id}, fcm_token: ${fcm_token === undefined ? 'not provided' : fcm_token}`);

    const existingDevice = await db.get<Device | null>(
      'SELECT * FROM devices WHERE user_id = ? AND device_id = ?',
      [user_id, device_id]
    );

    if (existingDevice) {
      logger.debug(`DeviceModel.create: Found existing device ID ${existingDevice.id} for user_id: ${user_id}, device_id: ${device_id}`);
      const updateFields = [];
      const params: any[] = []; // Ensure params can hold mixed types

      if (device_name !== existingDevice.device_name) {
        updateFields.push('device_name = ?');
        params.push(device_name);
        logger.debug(`DeviceModel.create: Device name requires update for device ID ${existingDevice.id}. New name: ${device_name}`);
      }
      // Only update fcm_token if it's explicitly provided and different, or if it's being cleared (set to null)
      // If fcm_token is undefined in input, don't change existing fcm_token unless it's currently something else and input means to clear it (which is not the case here as undefined means no change)
      if (fcm_token !== undefined && fcm_token !== existingDevice.fcm_token) {
        updateFields.push('fcm_token = ?');
        params.push(fcm_token); // fcm_token can be string or null
        logger.debug(`DeviceModel.create: FCM token requires update for device ID ${existingDevice.id}.`);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP'); // Always update updated_at
        const sql = `UPDATE devices SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(existingDevice.id);
        
        logger.debug(`DeviceModel.create: Executing update for device ID ${existingDevice.id}: ${sql} with params: ${JSON.stringify(params)}`);
        const updateResult = await db.run(sql, params);

        if (!updateResult || typeof updateResult.changes !== 'number' || updateResult.changes === 0) {
            logger.warn(`DeviceModel.create: UPDATE operation did not affect any rows for existing device ID ${existingDevice.id}. User: ${user_id}, DeviceID: ${device_id}. This might happen if the device was deleted concurrently. DB RunResult: ${JSON.stringify(updateResult)}`);
            // Attempt to re-fetch, it might still exist if another process re-created it, or it might be gone.
        } else {
            logger.debug(`DeviceModel.create: Update successful for device ID ${existingDevice.id}. Changes: ${updateResult.changes}`);
        }

        const updatedDevice = await db.get<Device | null>('SELECT * FROM devices WHERE id = ?', [existingDevice.id]);
        if (!updatedDevice) {
          logger.error(`DeviceModel.create: CRITICAL - Failed to retrieve device ID ${existingDevice.id} after attempting update. User: ${user_id}, DeviceID: ${device_id}.`);
          throw new Error('Failed to retrieve device after update.');
        }
        logger.debug(`DeviceModel.create: Successfully retrieved device ID ${updatedDevice.id} after update.`);
        return updatedDevice;
      }
      logger.debug(`DeviceModel.create: No updates needed for existing device ID ${existingDevice.id}. Returning existing.`);
      return existingDevice;
    } else {
      logger.debug(`DeviceModel.create: No existing device found for user_id: ${user_id}, device_id: ${device_id}. Creating new device.`);
      const insertSql = 'INSERT INTO devices (user_id, device_id, device_name, fcm_token, last_sync) VALUES (?, ?, ?, ?, NULL)';
      const insertParams = [user_id, device_id, device_name, fcm_token === undefined ? null : fcm_token]; // Ensure fcm_token is null if not provided
      
      logger.debug(`DeviceModel.create: Executing insert: ${insertSql} with params: ${JSON.stringify(insertParams)}`);
      const result = await db.run(insertSql, insertParams);

      if (!result || typeof result.lastID !== 'number' || result.lastID === 0) {
        logger.error(`DeviceModel.create: CRITICAL - Insert operation failed or did not return a valid lastID. User: ${user_id}, DeviceID: ${device_id}. DB RunResult: ${JSON.stringify(result)}`);
        throw new Error('Database insert operation failed to return a valid row ID.');
      }
      
      logger.debug(`DeviceModel.create: Insert successful. New device lastID: ${result.lastID}`);
      const createdDevice = await db.get<Device | null>('SELECT * FROM devices WHERE id = ?', [result.lastID]);
      if (!createdDevice) {
        logger.error(`DeviceModel.create: CRITICAL - Failed to retrieve new device by lastID ${result.lastID} after insert. User: ${user_id}, DeviceID: ${device_id}.`);
        throw new Error('Failed to create or retrieve device after insert.');
      }
      logger.debug(`DeviceModel.create: Successfully created and retrieved new device ID ${createdDevice.id}.`);
      return createdDevice;
    }
  }

  async update(userId: number, deviceId: string, data: Partial<Pick<Device, 'device_name' | 'last_sync'>>): Promise<void> {
    const db = await getDb();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.device_name !== undefined) {
        updates.push('device_name = ?');
        values.push(data.device_name);
    }
    if (data.last_sync !== undefined) {
        updates.push('last_sync = ?');
        values.push(data.last_sync);
    }

    if (updates.length === 0) {
        logger.warn(`DeviceModel.update called with no valid fields for user ${userId}, device ${deviceId}`);
        return;
    }

    values.push(userId);
    values.push(deviceId);

    const sql = `UPDATE devices SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND device_id = ?`;
    await db.run(sql, values);
  }

  async updateLastSync(userId: number, deviceId: string): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE devices SET last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
  }

  async delete(userId: number, deviceId: string): Promise<void> {
    const db = await getDb();
    await db.run(
      'DELETE FROM devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
  }

  async exists(userId: number, deviceId: string): Promise<boolean> {
    const device = await this.findByDeviceId(userId, deviceId);
    return device !== null;
  }
}

export async function removeDeviceByFcmToken(fcm_token: string): Promise<void> {
  const db = await getDb();
  logger.info(`DeviceModel: Attempting to remove device with FCM token: ${fcm_token}`);
  const result = await db.run('DELETE FROM devices WHERE fcm_token = ?', [fcm_token]);
  if (result && result.changes && result.changes > 0) {
    logger.info(`DeviceModel: Successfully removed device with FCM token: ${fcm_token}`);
  } else {
    logger.warn(`DeviceModel: No device found with FCM token: ${fcm_token}. Nothing to remove.`);
  }
}

export async function findDeviceByUserIdAndDeviceId(user_id: number, device_id: string): Promise<Device | undefined> {
  const db = await getDb();
  return db.get<Device>('SELECT id, user_id, device_id, device_name, last_sync, fcm_token, created_at, updated_at FROM devices WHERE user_id = ? AND device_id = ?', [user_id, device_id]);
}

export async function updateDeviceFcmToken(user_id: number, device_id: string, fcm_token: string): Promise<Device | undefined> {
  const db = await getDb();
  await db.run(
    'UPDATE devices SET fcm_token = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND device_id = ?',
    [fcm_token, user_id, device_id]
  );
  return findDeviceByUserIdAndDeviceId(user_id, device_id);
}

export default new DeviceModel();