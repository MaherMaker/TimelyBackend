import express from 'express';
import * as deviceController from '../controllers/deviceController';
import { authenticate as authenticateToken } from '../middleware/auth'; // Corrected path and import

const router = express.Router();

// Route to register a new device or update an existing one
// The `authenticateToken` middleware will add the user object to the request
router.post('/register', authenticateToken, deviceController.registerDevice);

// Route to specifically update the FCM token for a device
router.put('/fcm-token', authenticateToken, deviceController.updateFcmToken);

export default router;
