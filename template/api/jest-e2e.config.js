/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },
  testEnvironment: 'node',
  // Hermetic env defaults (LOGIN_STRATEGY etc.) — must run before module
  // imports because ConfigModule.forRoot() validates process.env eagerly.
  setupFiles: ['<rootDir>/e2e/setup-env.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../src/lib/$1',  // rootDir is api/, so ../src goes to template/src
  },
  // Increase timeout for Nest bootstrap
  testTimeout: 30000,
}
