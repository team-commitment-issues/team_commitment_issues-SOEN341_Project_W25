// ChatHavenApp/backend/config/jest/jest.config.js
const baseConfig = require('../../jest.base');

module.exports = {
  ...baseConfig,
  rootDir: '../../',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/config/jest/jest.setup.ts'],
  // These settings override the base config
  detectOpenHandles: true,
  forceExit: true
};
