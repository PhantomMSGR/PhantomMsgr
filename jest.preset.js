/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@phantom/database$': '<rootDir>/libs/database/src',
    '^@phantom/common$':   '<rootDir>/libs/common/src',
    '^@phantom/contracts$': '<rootDir>/libs/contracts/src',
    '^@phantom/auth$':     '<rootDir>/libs/auth/src',
    '^@phantom/redis$':    '<rootDir>/libs/redis/src',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
}
