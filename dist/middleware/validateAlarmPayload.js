"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAlarmPayload = validateAlarmPayload;
function validateAlarmPayload(req, res, next) {
    const { days, no_repeat } = req.body;
    try {
        // Parse days if it is a string
        if (typeof days === 'string') {
            req.body.days = JSON.parse(days);
        }
        // Validate days format
        if (!Array.isArray(req.body.days) || !req.body.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
            res.status(400).json({ success: false, message: 'Invalid days format. Use an array of days (0-6, where 0 is Sunday)' });
            return;
        }
        // Validate no_repeat
        if (no_repeat !== undefined && typeof no_repeat !== 'boolean') {
            res.status(400).json({ success: false, message: 'Invalid no_repeat value. It must be a boolean.' });
            return;
        }
        next();
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Invalid payload format.' });
    }
}
//# sourceMappingURL=validateAlarmPayload.js.map