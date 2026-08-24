/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config'),
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e-setup.ts'],
  testTimeout: 30000,
};
