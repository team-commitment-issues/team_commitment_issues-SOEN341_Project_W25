module.exports = {
    preset: 'ts-jest',
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: '<rootDir>/config/tsconfig/tsconfig.json',
      }]
    },
    testPathIgnorePatterns: [
      '/node_modules/',
      '/dist/'
    ],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/dist/'
    ],
    collectCoverage: true,
    clearMocks: true,
    testMatch: [
      '<rootDir>/src/__tests__/**/*.test.ts',
      '<rootDir>/src/__tests__/**/*.spec.ts'
    ],
    // Each package will define its own testEnvironment (node or jsdom)
  };