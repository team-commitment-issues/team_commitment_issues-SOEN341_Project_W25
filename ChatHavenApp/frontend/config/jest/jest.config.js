// packages/frontend/config/jest/jest.config.js
module.exports = {
  // Specify test environment
  testEnvironment: "jsdom",

  // Root directory is two levels up from this config
  rootDir: "../../",

  // Setup files that run before each test
  setupFiles: ["<rootDir>/src/jest.polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],

  // Module name mapper for handling non-JS imports
  moduleNameMapper: {
    // Handle CSS imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",

    // Handle image imports
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/config/jest/fileMock.js",

    // Handle module aliases
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/index.tsx",
    "!src/setupTests.ts",
    "!src/jest.polyfills.js",
    "!src/testUtils.tsx",
    "!src/reportWebVitals.ts",
    "!src/**/*.stories.*",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  transformIgnorePatterns: ["/node_modules/(?!(node-fetch)/)"],

  // Transform configuration for TypeScript
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/config/tsconfig/tsconfig.jest.json",
      },
    ],
  },

  // File extensions Jest will look for
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  // Test match pattern - matches both __tests__ directory and .test/spec files
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.{ts,tsx}",
    "<rootDir>/src/**/*.spec.{ts,tsx}",
  ],

  // Test result processor
  testResultsProcessor: "jest-sonar-reporter",

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/"],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
