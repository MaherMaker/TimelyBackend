import { Request, Response } from 'express';
import * as deviceService from '../services/deviceService';

export async function registerDevice(req: Request, res: Response): Promise<void> {
  const user_id = req.user?.userId; // Changed to userId to match global Express.Request augmentation
  const { device_id, device_name, fcm_token } = req.body;

  if (!user_id) {
    res.status(401).json({ message: 'Unauthorized: User ID is missing.' });
    return;
  }

  if (!device_id || !device_name) {
    res.status(400).json({ message: 'Device ID and Device Name are required.' });
    return;
  }

  try {
    const device = await deviceService.registerOrUpdateDevice(user_id, device_id, device_name, fcm_token);
    if (device) {
      res.status(200).json({ message: 'Device registered/updated successfully', device });
    } else {
      res.status(500).json({ message: 'Failed to register or update device' });
    }
  } catch (error) {
    console.error('Error registering or updating device:', error);
    if (error instanceof Error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    } else {
        res.status(500).json({ message: 'An unknown internal server error occurred' });
    }
  }
}

export async function updateFcmToken(req: Request, res: Response): Promise<void> {
    const user_id = req.user?.userId; // Changed to userId
    const { device_id, fcm_token } = req.body;

    if (!user_id) {
        res.status(401).json({ message: 'Unauthorized: User ID is missing.' });
        return;
    }

    if (!device_id || !fcm_token) {
        res.status(400).json({ message: 'Device ID and FCM token are required.'});
        return;
    }

    try {
        const device = await deviceService.updateDeviceFcmToken(user_id, device_id, fcm_token);
        if (device) {
            res.status(200).json({ message: 'FCM token updated successfully', device });
        } else {
            res.status(404).json({ message: 'Device not found or FCM token could not be updated.' });
        }
    } catch (error) {
        console.error('Error updating FCM token:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        } else {
            res.status(500).json({ message: 'An unknown internal server error occurred' });
        }
    }
}
