// src/test-setup.ts

// This file is run once before all test suites.
// You can use it for global setup, like:
// - Mocking global modules (e.g., 'fs', 'path')
// - Setting up a test database connection if not handled elsewhere
// - Global test environment configurations

// Example:
// jest.mock('./utils/logger', () => ({
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
//   debug: jest.fn(),
//   default: {
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn(),
//     debug: jest.fn(),
//   }
// }));

console.log('Global test setup file loaded.');
