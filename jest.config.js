module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/src/services/__tests__/socketService.test.ts'],
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@App/(.*)$': '<rootDir>/src/$1',
    '^@Config/(.*)$': '<rootDir>/src/config/$1',
    '^@Controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@Middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@Models/(.*)$': '<rootDir>/src/models/$1',
    '^@Routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@Services/(.*)$': '<rootDir>/src/services/$1',
    '^@Utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'], // Optional: for global test setup
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './html-report',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],
};
