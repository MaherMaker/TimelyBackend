"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alarmController_1 = __importDefault(require("../controllers/alarmController"));
const auth_1 = require("../middleware/auth");
const validateAlarmPayload_1 = require("../middleware/validateAlarmPayload");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/alarms
 * @desc    Get all alarms for the authenticated user
 * @access  Private
 */
router.get('/', auth_1.authenticate, alarmController_1.default.getAllAlarms);
/**
 * @route   GET /api/alarms/:id
 * @desc    Get a specific alarm by ID
 * @access  Private
 */
router.get('/:id', auth_1.authenticate, alarmController_1.default.getAlarm);
/**
 * @route   POST /api/alarms
 * @desc    Create a new alarm
 * @access  Private
 */
router.post('/', auth_1.authenticate, validateAlarmPayload_1.validateAlarmPayload, alarmController_1.default.createAlarm);
/**
 * @route   PUT /api/alarms/:id
 * @desc    Update an existing alarm
 * @access  Private
 */
router.put('/:id', auth_1.authenticate, validateAlarmPayload_1.validateAlarmPayload, alarmController_1.default.updateAlarm);
/**
 * @route   DELETE /api/alarms/:id
 * @desc    Delete an alarm
 * @access  Private
 */
router.delete('/:id', auth_1.authenticate, alarmController_1.default.deleteAlarm);
/**
 * @route   PUT /api/alarms/:id/toggle
 * @desc    Toggle alarm active state
 * @access  Private
 */
router.put('/:id/toggle', auth_1.authenticate, alarmController_1.default.toggleActive);
/**
 * @route   POST /api/alarms/sync
 * @desc    Synchronize alarms between devices
 * @access  Private
 */
router.post('/sync', auth_1.authenticate, alarmController_1.default.syncAlarms);
exports.default = router;
//# sourceMappingURL=alarmRoutes.js.map