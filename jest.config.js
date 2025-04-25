/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // Optional: specify roots if tests are not in the root directory
  roots: [
    '<rootDir>/tests' 
  ],
  // Optional: verbose output
  verbose: true,
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      // ts-jest configuration options here
      tsconfig: 'tsconfig.json' // Ensure this points to your TS config
    }]
  },
  // Setup files to run before test suite execution (optional)
  // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'], 
}; 