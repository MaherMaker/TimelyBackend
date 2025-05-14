import { Router } from 'express';
import alarmController from '../controllers/alarmController';
import { authenticate } from '../middleware/auth';
import { validateAlarmPayload } from '../middleware/validateAlarmPayload';

const router = Router();

/**
 * @route   GET /api/alarms
 * @desc    Get all alarms for the authenticated user
 * @access  Private
 */
router.get('/', authenticate, alarmController.getAllAlarms);

/**
 * @route   GET /api/alarms/:id
 * @desc    Get a specific alarm by ID
 * @access  Private
 */
router.get('/:id', authenticate, alarmController.getAlarm);

/**
 * @route   POST /api/alarms
 * @desc    Create a new alarm
 * @access  Private
 */
router.post('/', authenticate, validateAlarmPayload, alarmController.createAlarm);

/**
 * @route   PUT /api/alarms/:id
 * @desc    Update an existing alarm
 * @access  Private
 */
router.put('/:id', authenticate, validateAlarmPayload, alarmController.updateAlarm);

/**
 * @route   DELETE /api/alarms/:id
 * @desc    Delete an alarm
 * @access  Private
 */
router.delete('/:id', authenticate, alarmController.deleteAlarm);

/**
 * @route   PUT /api/alarms/:id/toggle
 * @desc    Toggle alarm active state
 * @access  Private
 */
router.put('/:id/toggle', authenticate, alarmController.toggleActive);

/**
 * @route   POST /api/alarms/sync
 * @desc    Synchronize alarms between devices
 * @access  Private
 */
router.post('/sync', authenticate, alarmController.syncAlarms);

export default router;