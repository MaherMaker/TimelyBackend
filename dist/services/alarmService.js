"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Alarm_1 = __importDefault(require("../models/Alarm")); // Uses camelCase
const Device_1 = __importDefault(require("../models/Device")); // Import Device interface
const logger_1 = __importDefault(require("../utils/logger"));
const socketService_1 = require("./socketService"); // Import the emit function
class AlarmService {
    async createAlarm(alarm) {
        try {
            // Ensure days is stringified before passing to model
            const alarmDataForDb = {
                ...alarm,
                days: Array.isArray(alarm.days) ? JSON.stringify(alarm.days) : alarm.days
            };
            // Pass data with stringified days to model
            const alarmId = await Alarm_1.default.create(alarmDataForDb);
            if (alarmId) {
                // findById returns camelCase
                const newAlarm = await Alarm_1.default.findById(alarmId, alarm.userId);
                if (newAlarm) {
                    // Emit event to other sockets of the same user
                    (0, socketService_1.emitToUser)(alarm.userId, 'alarm_created', newAlarm);
                }
                return {
                    success: true,
                    message: 'Alarm created successfully',
                    alarm: newAlarm || undefined,
                    id: alarmId
                };
            }
            else {
                return {
                    success: false,
                    message: 'Failed to create alarm'
                };
            }
        }
        catch (error) {
            logger_1.default.error('Error creating alarm', { error: error.message });
            return {
                success: false,
                message: 'Error creating alarm'
            };
        }
    }
    async updateAlarm(id, userId, data) {
        try {
            // findById returns camelCase
            const existingAlarm = await Alarm_1.default.findById(id, userId);
            if (!existingAlarm) {
                return {
                    success: false,
                    message: 'Alarm not found'
                };
            }
            // Ensure days is stringified before passing to model
            const updateDataForDb = {
                ...data,
                days: data.days && Array.isArray(data.days) ? JSON.stringify(data.days) : data.days
            };
            // Pass data with stringified days to model
            await Alarm_1.default.update(id, userId, updateDataForDb);
            // findById returns camelCase
            const updatedAlarm = await Alarm_1.default.findById(id, userId);
            if (updatedAlarm) {
                // Emit event to other sockets of the same user
                (0, socketService_1.emitToUser)(userId, 'alarm_updated', updatedAlarm);
            }
            return {
                success: true,
                message: 'Alarm updated successfully',
                alarm: updatedAlarm || undefined
            };
        }
        catch (error) {
            logger_1.default.error('Error updating alarm', { error: error.message });
            return {
                success: false,
                message: 'Error updating alarm'
            };
        }
    }
    async deleteAlarm(id, userId) {
        try {
            // findById returns camelCase
            const alarm = await Alarm_1.default.findById(id, userId);
            if (!alarm) {
                return {
                    success: false,
                    message: 'Alarm not found'
                };
            }
            await Alarm_1.default.delete(id, userId);
            // Emit event to other sockets of the same user
            (0, socketService_1.emitToUser)(userId, 'alarm_deleted', { id });
            return {
                success: true,
                message: 'Alarm deleted successfully'
            };
        }
        catch (error) {
            logger_1.default.error('Error deleting alarm', { error: error.message });
            return {
                success: false,
                message: 'Error deleting alarm'
            };
        }
    }
    async getAlarm(id, userId) {
        try {
            // findById returns camelCase
            const alarm = await Alarm_1.default.findById(id, userId);
            if (!alarm) {
                return {
                    success: false,
                    message: 'Alarm not found'
                };
            }
            return {
                success: true,
                message: 'Alarm retrieved successfully',
                alarm // Already camelCase
            };
        }
        catch (error) {
            logger_1.default.error('Error retrieving alarm', { error: error.message });
            return {
                success: false,
                message: 'Error retrieving alarm'
            };
        }
    }
    async getAllAlarms(userId) {
        try {
            // findAllByUserId returns camelCase[]
            const alarms = await Alarm_1.default.findAllByUserId(userId);
            return {
                success: true,
                message: 'Alarms retrieved successfully',
                alarms // Already camelCase
            };
        }
        catch (error) {
            logger_1.default.error('Error retrieving alarms', { error: error.message });
            return {
                success: false,
                message: 'Error retrieving alarms'
            };
        }
    }
    async toggleAlarmActive(id, userId, isActive) {
        try {
            // findById returns camelCase
            const alarm = await Alarm_1.default.findById(id, userId);
            if (!alarm) {
                return {
                    success: false,
                    message: 'Alarm not found'
                };
            }
            // Pass camelCase isActive to model
            await Alarm_1.default.toggleActive(id, userId, isActive);
            // findById returns camelCase
            const updatedAlarm = await Alarm_1.default.findById(id, userId);
            if (updatedAlarm) {
                // Emit event to other sockets of the same user
                (0, socketService_1.emitToUser)(userId, 'alarm_updated', updatedAlarm);
            }
            return {
                success: true,
                message: `Alarm ${isActive ? 'activated' : 'deactivated'} successfully`,
                alarm: updatedAlarm || undefined
            };
        }
        catch (error) {
            logger_1.default.error('Error toggling alarm active state', { error: error.message });
            return {
                success: false,
                message: 'Error toggling alarm active state'
            };
        }
    }
    async syncAlarms(userId, deviceId, clientAlarms // Expects camelCase[] from client
    ) {
        const syncStartTime = new Date(); // Record start time for final update
        let lastSyncTimestamp;
        try {
            // 1. Fetch device and its last sync time
            let device = await Device_1.default.findByDeviceId(userId, deviceId);
            if (!device) {
                // 2. Device doesn't exist, register it
                logger_1.default.info(`Device ${deviceId} not found for user ${userId}. Registering...`);
                try {
                    await Device_1.default.create({
                        user_id: userId, // Pass snake_case to model
                        device_id: deviceId, // Pass snake_case to model
                        device_name: `Device ${deviceId.substring(0, 6)}`, // Default name
                        // last_sync is set automatically by create method
                    });
                    // Fetch the newly created device to get its initial state (including last_sync)
                    device = await Device_1.default.findByDeviceId(userId, deviceId);
                    if (!device) {
                        // Should not happen if create was successful, but handle defensively
                        throw new Error('Failed to retrieve newly registered device.');
                    }
                    logger_1.default.info(`Device ${deviceId} registered successfully for user ${userId}.`);
                    // For a new device, we want all existing alarms
                    lastSyncTimestamp = new Date(0).toISOString(); // Use epoch start
                }
                catch (registrationError) {
                    logger_1.default.error('Failed to register device', { userId, deviceId, error: registrationError.message });
                    return { success: false, message: 'Failed to register device.' };
                }
            }
            else {
                // Device exists, use its last sync time
                lastSyncTimestamp = device.last_sync; // Property is snake_case from DB/model
                if (!lastSyncTimestamp) {
                    logger_1.default.warn(`Device ${deviceId} for user ${userId} has null last_sync. Using epoch.`);
                    lastSyncTimestamp = new Date(0).toISOString(); // Default to epoch if null
                }
            }
            logger_1.default.info(`Starting sync for user ${userId}, device ${deviceId}. Last sync: ${lastSyncTimestamp}`);
            // 3. Process client alarms (apply "Last Write Wins" from client)
            const processedClientIds = new Set(); // Keep track of IDs processed from client
            for (const clientAlarm of clientAlarms) {
                // Ensure data from client is treated as camelCase
                const alarmData = {
                    ...clientAlarm,
                    userId: userId, // Ensure userId is set
                    deviceId: deviceId, // Associate with this device if new/updated here
                    syncStatus: 'synced', // Mark as synced after processing
                    // Ensure days is stringified if it's an array
                    days: Array.isArray(clientAlarm.days) ? JSON.stringify(clientAlarm.days) : clientAlarm.days,
                };
                try {
                    if (clientAlarm.id) {
                        // Client sent an existing alarm (Update or Create-if-missing)
                        const existingServerAlarm = await Alarm_1.default.findById(clientAlarm.id, userId);
                        processedClientIds.add(clientAlarm.id);
                        if (existingServerAlarm) {
                            // Alarm exists on server -> Update (Client Wins)
                            logger_1.default.debug(`Sync: Updating alarm ${clientAlarm.id} from client ${deviceId}`);
                            // Pass camelCase data to model's update method
                            await Alarm_1.default.update(clientAlarm.id, userId, alarmData);
                        }
                        else {
                            // Alarm doesn't exist on server (maybe deleted elsewhere) -> Create (Client Wins)
                            logger_1.default.debug(`Sync: Re-creating alarm ${clientAlarm.id} from client ${deviceId} as it was missing.`);
                            // Remove id before creating, pass camelCase data
                            delete alarmData.id;
                            await Alarm_1.default.create(alarmData); // Cast as Alarm after removing optional id
                        }
                    }
                    else {
                        // Client sent a new alarm -> Create
                        logger_1.default.debug(`Sync: Creating new alarm from client ${deviceId}`);
                        // Pass camelCase data to model's create method
                        await Alarm_1.default.create(alarmData); // Cast as Alarm as required fields are set
                    }
                }
                catch (processingError) {
                    logger_1.default.error('Error processing client alarm during sync', { userId, deviceId, alarmId: clientAlarm.id, error: processingError.message });
                    // Decide whether to continue or abort sync; continuing for now
                }
            }
            // 4. Fetch server changes since the *previous* sync timestamp
            // This includes changes made above AND changes from other devices/sources
            // getAlarmsForSync returns camelCase[]
            const serverChanges = await Alarm_1.default.getAlarmsForSync(userId, lastSyncTimestamp);
            logger_1.default.info(`Found ${serverChanges.length} server changes since ${lastSyncTimestamp} for user ${userId}`);
            // 5. Update device's last sync time to the time the sync started
            // Use the specific timestamp from the start of the operation
            await Device_1.default.update(userId, deviceId, { last_sync: syncStartTime.toISOString() });
            logger_1.default.info(`Updated last_sync for user ${userId}, device ${deviceId} to ${syncStartTime.toISOString()}`);
            // 6. Return server changes to the client
            return {
                success: true,
                message: 'Sync completed successfully',
                alarms: serverChanges // Return camelCase alarms
            };
        }
        catch (error) {
            logger_1.default.error('Critical error during alarm sync', { userId, deviceId, error: error.message, stack: error.stack });
            return {
                success: false,
                message: 'Error syncing alarms'
            };
        }
    }
}
exports.default = new AlarmService();
//# sourceMappingURL=alarmService.js.map