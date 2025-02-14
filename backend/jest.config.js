module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/__tests__/testHelpers.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};