import { Request, Response, NextFunction } from 'express';

export function validateAlarmPayload(req: Request, res: Response, next: NextFunction): void {
  const { no_repeat } = req.body;
  let daysValue = req.body.days; // Use a local variable

  try {
    if (daysValue !== undefined) {
      if (typeof daysValue === 'string') {
        try {
          daysValue = JSON.parse(daysValue);
          req.body.days = daysValue; // Update req.body with the parsed value
        } catch (e) {
          res.status(400).json({ success: false, message: "Field 'days' must be a valid JSON array string if provided as a string." });
          return;
        }
      }

      if (!Array.isArray(daysValue) || !daysValue.every((day: any) => Number.isInteger(day) && day >= 0 && day <= 6)) {
        res.status(400).json({ success: false, message: 'Invalid days format. Must be an array of integers (0-6, Sunday is 0).' });
        return;
      }
    }
    // If daysValue is undefined, validation for it is skipped.

    if (no_repeat !== undefined && typeof no_repeat !== 'boolean') {
      res.status(400).json({ success: false, message: 'Invalid no_repeat value. It must be a boolean.' });
      return;
    }

    next();
  } catch (error) {
    // This catch is for unexpected errors during the validation process itself.
    console.error("Unexpected error in validateAlarmPayload middleware:", error);
    res.status(500).json({ success: false, message: 'Internal server error during payload validation.' });
  }
}