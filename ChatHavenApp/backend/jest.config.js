module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/__tests__/testHelpers.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    
    // Improved settings for stability
    verbose: true,
    testTimeout: 30000, // Increased timeout for slow CI environments
    maxWorkers: 1, // Run tests strictly serially
    forceExit: true, // Force Jest to exit after all tests complete
    detectOpenHandles: true, // Help identify what's keeping Node running
    bail: 0, // Don't stop on first failure
    // Add retry capability for flaky tests
    retry: 2,
    // Make tests not share global state
    isolatedModules: true,
};