import { Server, Socket } from 'socket.io';
import { SocketService } from '../socketService'; // Import the class
import { Alarm } from '../../models/Alarm';

// Mock Socket.io Server and Socket
const mockEmit = jest.fn();
// New mock structure for to().except().emit()
const mockExceptChain = { emit: mockEmit };      // Object returned by .except()
const mockExcept = jest.fn(() => mockExceptChain); // The .except() method mock
const mockToChain = { emit: mockEmit, except: mockExcept }; // Object returned by .to()

let mockClientSocket: any;

const mockIoServer = {
  on: jest.fn((event: string, callback: (socket: any) => void) => {
    if (event === 'connection') {
      // Initialize mockClientSocket here, so it's fresh for each test
      // and is the one the service's handleConnection will operate on.
      mockClientSocket = {
        id: 'mockSocketId',
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(), // This will be called by socketService.handleConnection
        handshake: { auth: { token: 'validToken', deviceId: 'testDevice' }, query: { deviceId: 'testDevice'} },
        disconnect: jest.fn(),
        // Add userId and deviceId as the auth middleware would
        userId: 1, // Example userId from mock jwt.verify
        deviceId: 'testDevice' // Example deviceId
      };
      callback(mockClientSocket); // This invokes socketService.handleConnection
    }
  }),
  use: jest.fn(), // Auth middleware will be passed here
  to: jest.fn(() => mockToChain), // mockIoServer.to() will return mockToChain
  emit: mockEmit, // For direct server emits, if any
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIoServer),
}));

jest.mock('jsonwebtoken', () => ({
  // Ensure jwt.verify provides the userId that mockClientSocket expects
  verify: jest.fn().mockReturnValue({ userId: 1, deviceId: 'testDevice' }),
}));

describe('SocketService', () => {
  let socketService: SocketService;
  let httpServer: any;

  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mocks first.
    // Clear calls for chained mocks as well
    mockEmit.mockClear();
    mockExcept.mockClear();
    (mockIoServer.to as jest.Mock).mockClear();

    httpServer = {} as any; // Dummy http server
    // When new SocketService is created, it will:
    // 1. Create a new Server (which returns mockIoServer).
    // 2. Call mockIoServer.use(authMiddleware).
    // 3. Call mockIoServer.on('connection', handleConnectionCallback).
    //    - The mockIoServer.on implementation will then:
    //      - Create our mockClientSocket.
    //      - Add userId/deviceId to it (simulating auth middleware outcome).
    //      - Call handleConnectionCallback(mockClientSocket).
    // This means that by the end of this line, handleConnection has been executed
    // on the newly created mockClientSocket.
    socketService = new SocketService(httpServer);
  });

  it('should initialize Socket.io server on instantiation', () => {
    expect(Server).toHaveBeenCalledWith(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    expect(mockIoServer.use).toHaveBeenCalledWith(expect.any(Function)); // Middleware registration
    expect(mockIoServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  describe('handleConnection', () => {
    it('should handle new client connection, join room and set up disconnect', () => {
        // mockClientSocket is initialized and handleConnection is called on it
        // during the `new SocketService()` in beforeEach.
        expect(mockClientSocket).toBeDefined();
        expect(mockClientSocket.join).toHaveBeenCalledWith('user_1'); // Assuming userId 1 from mock
        expect(mockClientSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockClientSocket.on).toHaveBeenCalledWith('joinAlarmRoom', expect.any(Function));
        expect(mockClientSocket.on).toHaveBeenCalledWith('leaveAlarmRoom', expect.any(Function));
    });
  });

  describe('emitToUser', () => {
    it('should emit an event to the specified user room', () => {
      const userId = 1;
      const event = 'testEvent';
      const data = { message: 'hello' };
      socketService.emitToUser(userId, event, data);
      expect(mockIoServer.to).toHaveBeenCalledWith(`user_${userId}`);
      // mockToChain.emit was called because mockIoServer.to returns mockToChain
      expect(mockEmit).toHaveBeenCalledWith(event, data);
    });

    it('should emit an event to the user room, excluding senderSocketId if provided', () => {
        const userId = 1;
        const event = 'testEvent';
        const data = { message: 'hello' };
        const senderSocketId = 'mockSenderSocketId';

        socketService.emitToUser(userId, event, data, senderSocketId);
        
        expect(mockIoServer.to).toHaveBeenCalledWith(`user_${userId}`);
        // mockIoServer.to() returns mockToChain, so mockToChain.except is called.
        // mockToChain.except is our mockExcept function.
        expect(mockExcept).toHaveBeenCalledWith(senderSocketId);
        // mockExcept() returns mockExceptChain, so mockExceptChain.emit is called.
        // mockExceptChain.emit is our mockEmit function.
        expect(mockEmit).toHaveBeenCalledWith(event, data);
    });
  });

  // Test client-originated events like 'joinAlarmRoom' and 'leaveAlarmRoom'
  describe('client event handling', () => {
    it('should handle joinAlarmRoom event from client', () => {
        // Simulate the 'joinAlarmRoom' event being emitted by the client
        // Ensure the listener was attached
        expect(mockClientSocket.on).toHaveBeenCalledWith('joinAlarmRoom', expect.any(Function));
        // Retrieve the callback registered by handleConnection
        const joinAlarmRoomCallback = (mockClientSocket.on as jest.Mock).mock.calls.find(call => call[0] === 'joinAlarmRoom')?.[1];
        expect(joinAlarmRoomCallback).toBeDefined(); // Make sure the callback was found

        if (joinAlarmRoomCallback) {
            const testAlarmId = 'alarm123';
            joinAlarmRoomCallback(testAlarmId); // Invoke the callback
            expect(mockClientSocket.join).toHaveBeenCalledWith(`alarm_${testAlarmId}`);
        }
    });

    it('should handle leaveAlarmRoom event from client', () => {
        // Simulate the 'leaveAlarmRoom' event being emitted by the client
        expect(mockClientSocket.on).toHaveBeenCalledWith('leaveAlarmRoom', expect.any(Function));
        const leaveAlarmRoomCallback = (mockClientSocket.on as jest.Mock).mock.calls.find(call => call[0] === 'leaveAlarmRoom')?.[1];
        expect(leaveAlarmRoomCallback).toBeDefined();

        if (leaveAlarmRoomCallback) {
            const testAlarmId = 'alarm456';
            leaveAlarmRoomCallback(testAlarmId); // Invoke the callback
            expect(mockClientSocket.leave).toHaveBeenCalledWith(`alarm_${testAlarmId}`);
        }
    });
  });

});
