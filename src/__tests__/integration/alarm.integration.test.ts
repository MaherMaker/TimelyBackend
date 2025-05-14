import request from 'supertest';
import app from '../../app'; // Express app
import AlarmModel from '../../models/Alarm';

// Mock models
jest.mock('../../models/Alarm');

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

// Mock the auth middleware for the 'authenticate' named export
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    // Simulate an authenticated user
    req.user = { userId: 1, username: 'testuser', deviceId: 'testDevice' };
    next();
  })
}));

const mockAlarm = {
  id: 1,
  userId: 1,
  title: 'Test Alarm',
  time: '08:00',
  days: [1, 2, 3], // Changed to array of numbers
  sound: 'default',
  vibration: true,
  snoozeInterval: 5,
  snoozeCount: 3,
  isActive: true,
  noRepeat: false,
  deviceId: 'testDevice',
  syncStatus: 'synced' as 'synced' | 'pending' | 'conflict',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Alarm API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure the mock middleware is used for each test
    // This is important if the middleware is applied at the router level in app.ts
    // If applied globally, the jest.mock above is sufficient.
  });

  describe('POST /api/alarms', () => {
    it('should create a new alarm successfully', async () => {
      const newAlarmDataPayload = {
        title: 'New Test Alarm',
        time: '09:00',
        days: JSON.stringify([1, 5]), // Send as JSON string to test middleware parsing
      };
      const expectedDaysArray = [1, 5];

      (AlarmModel.create as jest.Mock).mockResolvedValue(123);
      (AlarmModel.findById as jest.Mock).mockImplementation(async (id) => {
        if (id === 123) {
          return {
            id: 123,
            userId: 1,
            title: newAlarmDataPayload.title,
            time: newAlarmDataPayload.time,
            days: expectedDaysArray, // Model and service should deal with the array
            deviceId: 'testDevice',
            isActive: true,
            noRepeat: false,
            sound: 'default',
            vibration: true,
            snoozeInterval: 5,
            snoozeCount: 3,
            syncStatus: 'synced',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      });

      const response = await request(app)
        .post('/api/alarms')
        .send(newAlarmDataPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alarm created successfully');
      expect(response.body.alarm.id).toBe(123);
      expect(response.body.alarm.title).toBe(newAlarmDataPayload.title);
      expect(response.body.alarm.days).toEqual(expectedDaysArray);
      expect(AlarmModel.create).toHaveBeenCalledWith(expect.objectContaining({
        title: newAlarmDataPayload.title,
        time: newAlarmDataPayload.time,
        days: JSON.stringify(expectedDaysArray), // Expecting JSON string for model call
        userId: 1,
        deviceId: 'testDevice',
      }));
    });

    it('should return 400 for invalid alarm payload', async () => {
      const response = await request(app)
        .post('/api/alarms')
        .send({ title: 'Invalid Alarm', time: '10:00' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Required fields missing: title, time, days');
    });
  });

  describe('GET /api/alarms', () => {
    it('should retrieve all alarms for the authenticated user', async () => {
      (AlarmModel.findAllByUserId as jest.Mock).mockResolvedValue([mockAlarm]);

      const response = await request(app).get('/api/alarms');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.alarms.length).toBe(1);
      expect(response.body.alarms[0].id).toBe(mockAlarm.id);
      expect(AlarmModel.findAllByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/alarms/:id', () => {
    it('should retrieve a specific alarm by ID for the authenticated user', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(mockAlarm);

      const response = await request(app).get(`/api/alarms/${mockAlarm.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.alarm.id).toBe(mockAlarm.id);
      expect(AlarmModel.findById).toHaveBeenCalledWith(mockAlarm.id, 1);
    });

    it('should return 404 if alarm not found or does not belong to user', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(null);
      const response = await request(app).get('/api/alarms/999');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Alarm not found');
    });
  });

  describe('PUT /api/alarms/:id', () => {
    it('should update an existing alarm successfully', async () => {
      const updatedDataPayload = {
        title: 'Updated Test Alarm',
        time: '10:00',
        days: JSON.stringify([2, 4]) // Send as JSON string
      };
      const expectedUpdatedDaysArray = [2, 4];
      const originalAlarm = { ...mockAlarm, id: mockAlarm.id, days: [1, 2, 3] }; // Ensure original days is an array for mock
      const expectedServiceUpdatedAlarm = {
        ...originalAlarm,
        title: updatedDataPayload.title,
        time: updatedDataPayload.time,
        days: expectedUpdatedDaysArray
      };

      (AlarmModel.findById as jest.Mock)
        .mockResolvedValueOnce(originalAlarm)
        .mockResolvedValueOnce(expectedServiceUpdatedAlarm);
      (AlarmModel.update as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/alarms/${mockAlarm.id}`)
        .send(updatedDataPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alarm updated successfully');
      expect(response.body.alarm.title).toBe(updatedDataPayload.title);
      expect(response.body.alarm.days).toEqual(expectedUpdatedDaysArray);
      expect(AlarmModel.update).toHaveBeenCalledWith(mockAlarm.id, 1, expect.objectContaining({
        title: updatedDataPayload.title,
        time: updatedDataPayload.time,
        days: JSON.stringify(expectedUpdatedDaysArray), // Expecting JSON string for model call
      }));
    });

    it('should return 404 if alarm to update is not found', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(null);
      const response = await request(app)
        .put('/api/alarms/999')
        .send({ title: 'NonExistent', time: '11:00', days: [1] });
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Alarm not found');
    });

    it('should return 400 for invalid update payload', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(mockAlarm);
      const response = await request(app)
        .put(`/api/alarms/${mockAlarm.id}`)
        .send({ time: 'invalid-time-format' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid time format. Use HH:MM (24-hour format)');
    });
  });

  describe('DELETE /api/alarms/:id', () => {
    it('should delete an alarm successfully', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(mockAlarm);
      (AlarmModel.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete(`/api/alarms/${mockAlarm.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alarm deleted successfully');
      expect(AlarmModel.delete).toHaveBeenCalledWith(mockAlarm.id, 1);
    });

    it('should return 404 if alarm to delete is not found', async () => {
      (AlarmModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/api/alarms/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Alarm not found');
    });
  });
});
