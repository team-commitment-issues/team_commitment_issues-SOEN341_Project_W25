module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/__tests__/testHelpers.ts', '/src/__tests__/mongooseMockHelper.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    detectOpenHandles: true,
    forceExit: true,
};