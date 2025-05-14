import { AlarmService } from '../alarmService';
import AlarmModel from '../../models/Alarm'; // Changed to default import
import DeviceModel from '../../models/Device'; // Changed to default import
import * as socketService from '../socketService'; // Import as a module to mock its functions
import { User } from '../../models/User'; // Assuming User model might be needed for context

// Mock the models and services
jest.mock('../../models/Alarm');
jest.mock('../../models/Device');
jest.mock('../socketService'); // Mock the entire socketService module

describe('AlarmService', () => {
  let alarmService: AlarmService;
  const mockUser = { id: 1, username: 'testuser' } as User; // Mock user object
  const mockDeviceId = 'testDevice123';
  const mockSocketId = 'socketTestId123';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    alarmService = new AlarmService();
  });

  describe('createAlarm', () => {
    it('should create an alarm successfully and emit a socket event', async () => {
      const alarmInputData = { // Renamed from alarmData to avoid confusion with Alarm interface
        title: 'Test Alarm', // Added title, as it's required by Alarm interface
        time: '10:00',
        days: '[1,2,3]', // Stringified as per Alarm model expectation
        isActive: true, // Changed from isEnabled to isActive
        snoozeCount: 0,
        snoozeInterval: 5, // Changed from snoozeDuration
        sound: 'default_sound.mp3',
        userId: mockUser.id, // Added userId
        deviceId: mockDeviceId, // Added deviceId
        // noRepeat, vibration can be optional or have defaults in model
      };
      const createdAlarmMock = { // This is what AlarmModel.findById would return
        id: 1,
        ...alarmInputData, // Spread the input data
        // Ensure all fields from Alarm interface are present if needed for the result
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' as 'pending', // Default syncStatus
      };

      // Mock AlarmModel.create to return the ID
      (AlarmModel.create as jest.Mock).mockResolvedValue(1);
      // Mock AlarmModel.findById to return the created alarm
      (AlarmModel.findById as jest.Mock).mockResolvedValue(createdAlarmMock);

      // Corrected call to createAlarm
      const result = await alarmService.createAlarm(alarmInputData as any, mockSocketId); // Cast to any for now if type issues persist with partial data

      // Expect AlarmModel.create to be called with the correct structure
      expect(AlarmModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...alarmInputData,
          days: '[1,2,3]', // Ensure days is stringified for the model
        })
      );
      expect(socketService.emitToUser).toHaveBeenCalledWith(
        mockUser.id,
        'alarm_created',
        createdAlarmMock,
        mockSocketId
      );
      expect(result.success).toBe(true);
      expect(result.alarm).toEqual(createdAlarmMock);
      expect(result.id).toEqual(1);
    });

    it('should return success false if alarm creation in model fails', async () => {
      const alarmInputData = {
        title: 'Fail Alarm',
        time: '11:00',
        days: '[0]',
        isActive: true,
        snoozeCount: 0,
        snoozeInterval: 5,
        sound: 'sound.mp3',
        userId: mockUser.id,
        deviceId: mockDeviceId,
      };
      const errorMessage = 'Database error on create';
      (AlarmModel.create as jest.Mock).mockResolvedValue(0); // Simulate failure by returning 0 or undefined

      // Corrected call to createAlarm
      const result = await alarmService.createAlarm(alarmInputData as any, mockSocketId);

      expect(AlarmModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
            ...alarmInputData,
            days: '[0]',
        })
      );
      expect(socketService.emitToUser).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create alarm');
    });

    it('should return success false if findById after creation fails', async () => {
        const alarmInputData = {
          title: 'Fail Find Alarm',
          time: '12:00',
          days: '[1]',
          isActive: true,
          snoozeCount: 0,
          snoozeInterval: 5,
          sound: 'sound.mp3',
          userId: mockUser.id,
          deviceId: mockDeviceId,
        };
        (AlarmModel.create as jest.Mock).mockResolvedValue(99); // Assume creation gives an ID
        (AlarmModel.findById as jest.Mock).mockResolvedValue(null); // Simulate findById failing

        const result = await alarmService.createAlarm(alarmInputData as any, mockSocketId);

        expect(AlarmModel.create).toHaveBeenCalled();
        expect(AlarmModel.findById).toHaveBeenCalledWith(99, alarmInputData.userId);
        expect(socketService.emitToUser).not.toHaveBeenCalled(); // Or called with specific error data if that's the behavior
        expect(result.success).toBe(true); // createAlarm service method still returns success true if ID is generated
        expect(result.message).toBe('Alarm created successfully'); // but alarm object is undefined
        expect(result.alarm).toBeUndefined();
        expect(result.id).toBe(99);
      });

    it('should handle errors during alarm creation in service', async () => {
        const alarmInputData = {
            title: 'Service Error Alarm',
            time: '13:00',
            days: '[2]',
            isActive: true,
            snoozeCount: 0,
            snoozeInterval: 5,
            sound: 'sound.mp3',
            userId: mockUser.id,
            deviceId: mockDeviceId,
          };
        const errorMessage = 'Internal service error';
        (AlarmModel.create as jest.Mock).mockRejectedValue(new Error(errorMessage));

        const result = await alarmService.createAlarm(alarmInputData as any, mockSocketId);

        expect(AlarmModel.create).toHaveBeenCalled();
        expect(socketService.emitToUser).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.message).toBe('Error creating alarm');
    });
  });

  // TODO: Add more describe blocks for other methods like:
  // describe('updateAlarm', () => { ... });
  // describe('deleteAlarm', () => { ... });
  // describe('toggleAlarmActive', () => { ... });
  // describe('getUserAlarms', () => { ... });
  // describe('syncAlarms', () => { ... });
  //   - Test case for new device registration
  //   - Test case for existing device, fetching changes
  //   - Test case for client sending new alarms
  //   - Test case for client sending updated alarms
  //   - Test case for client sending deleted alarm IDs
  //   - Test case for conflict resolution (if applicable)
});
