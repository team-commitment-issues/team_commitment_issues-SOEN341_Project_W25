// ChatHavenApp/backend/config/jest/jest.config.js
import baseConfig from '../../jest.base';

module.exports = {
  ...baseConfig,
  rootDir: '../../',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/config/jest/jest.setup.ts'],
  // These settings override the base config
  detectOpenHandles: true,
  forceExit: true
};
