import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@phantom/database$':  '<rootDir>/libs/database/src',
    '^@phantom/common$':    '<rootDir>/libs/common/src',
    '^@phantom/contracts$': '<rootDir>/libs/contracts/src',
    '^@phantom/auth$':      '<rootDir>/libs/auth/src',
    '^@phantom/redis$':     '<rootDir>/libs/redis/src',
  },
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  collectCoverageFrom: [
    'apps/**/*.service.ts',
    'libs/**/*.ts',
    '!**/*.module.ts',
    '!**/*.constants.ts',
    '!**/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
}

export default config
