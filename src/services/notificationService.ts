import admin from '../config/firebase'; // Changed from 'firebase-admin'
import logger from '../utils/logger';
import { removeDeviceByFcmToken } from '../models/Device'; // Import the new function

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: { [key: string]: string }; // Optional custom data
}

/**
 * Sends a push notification to a specific device token.
 * @param {PushNotificationPayload} payload - The notification payload.
 * @returns {Promise<boolean>} True if the message was sent successfully, false otherwise.
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  const { token, title, body, data } = payload;

  if (!token) {
    logger.error('NotificationService: FCM token is missing. Cannot send notification.');
    return false;
  }

  const message: admin.messaging.Message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    data: data, // Attach custom data if provided
    // Android specific configuration
    android: {
      priority: 'high', // Ensure messages are delivered promptly
      notification: {
        sound: 'default', // Default sound
        // channelId: 'default_channel_id', // Optional: Specify a notification channel for Android 8.0+
      },
    },
    // APNS (iOS) specific configuration
    apns: {
      payload: {
        aps: {
          sound: 'default', // Default sound
          badge: 1, // Example: set badge number
          contentAvailable: data ? true : undefined, // For background updates if data is present
        },
      },
    },
  };

  try {
    logger.info(`NotificationService: Attempting to send push notification to token: ${token.substring(0, 20)}...`);
    const response = await admin.messaging().send(message);
    logger.info('NotificationService: Successfully sent message: ' + response);
    return true;
  } catch (error: any) {
    logger.error('NotificationService: Error sending message:', {
      messageId: error.messageId,
      code: error.code,
      errorMessage: error.message,
      // stack: error.stack, // Stack can be very verbose
      tokenUsed: token.substring(0, 20) + '...'
    });
    if (error.code === 'messaging/registration-token-not-registered') {
      logger.warn(`NotificationService: FCM token ${token.substring(0,20)}... is not registered or expired.`);
      try {
        await removeDeviceByFcmToken(token);
        logger.info(`NotificationService: Successfully removed device with FCM token ${token.substring(0,20)}... from database.`);
      } catch (dbError: any) {
        logger.error(`NotificationService: Failed to remove device with FCM token ${token.substring(0,20)}... from database:`, { error: dbError.message, stack: dbError.stack });
      }
    }
    return false;
  }
}

/**
 * Sends a data-only push notification for background sync.
 * @param {string} token - The device FCM token.
 * @param {object} data - The data payload to send.
 * @returns {Promise<boolean>} True if the message was sent successfully, false otherwise.
 */
export async function sendDataNotification(token: string, data: { [key: string]: string }): Promise<boolean> {
  if (!token) {
    logger.error('NotificationService: FCM token is missing. Cannot send data notification.');
    return false;
  }
  if (!data || Object.keys(data).length === 0) {
    logger.error('NotificationService: Data payload is missing or empty. Cannot send data notification.');
    return false;
  }

  const message: admin.messaging.Message = {
    token: token,
    data: data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true, // Required for silent notifications on iOS
        },
      },
      headers: {
        'apns-push-type': 'background', // For iOS 13+ to indicate background notification
        'apns-priority': '5', // Send data message with normal priority to conserve battery
      }
    },
  };

  try {
    logger.info(`NotificationService: Attempting to send data notification to token: ${token.substring(0, 20)}... Data: ${JSON.stringify(data)}`);
    const response = await admin.messaging().send(message);
    logger.info('NotificationService: Successfully sent data message: ' + response);
    return true;
  } catch (error: any) {
    logger.error('NotificationService: Error sending data message:', {
      messageId: error.messageId,
      code: error.code,
      errorMessage: error.message,
      // stack: error.stack, // Stack can be very verbose
      tokenUsed: token.substring(0, 20) + '...'
    });
    if (error.code === 'messaging/registration-token-not-registered') {
      logger.warn(`NotificationService: FCM token ${token.substring(0,20)}... is not registered or expired for data message.`);
      try {
        await removeDeviceByFcmToken(token);
        logger.info(`NotificationService: Successfully removed device with FCM token ${token.substring(0,20)}... for data message from database.`);
      } catch (dbError: any) {
        logger.error(`NotificationService: Failed to remove device with FCM token ${token.substring(0,20)}... for data message from database:`, { error: dbError.message, stack: dbError.stack });
      }
    }
    return false;
  }
}
