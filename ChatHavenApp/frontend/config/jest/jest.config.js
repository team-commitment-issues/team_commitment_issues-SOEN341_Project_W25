// ChatHavenApp/frontend/config/jest/jest.config.js
const baseConfig = require('../../jest.base');

module.exports = {
  ...baseConfig,
  rootDir: '../../',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  setupFiles: ['<rootDir>/src/jest.polyfills.js'],
  moduleNameMapper: {
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/jest/fileMock.js',
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
