// Two projects = two test boundaries.
//   npm run test:unit         → no I/O, parallel
//   npm run test:integration  → real database, one file at a time
//
// JavaScript project? Delete the `transform` lines — Jest runs .js as is.
// These options are merged over your tsconfig.json; `types` makes it/expect
// available even if your tsconfig limits "types" (or you have none).
const tsJest = {
  '^.+\\.ts$': [
    'ts-jest',
    { tsconfig: { module: 'commonjs', moduleResolution: 'bundler', esModuleInterop: true, types: ['node', 'jest'] } },
  ],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform: tsJest,
      testMatch: ['<rootDir>/test/unit/**/*.test.[jt]s'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: tsJest,
      testMatch: ['<rootDir>/test/integration/**/*.test.[jt]s'],
      setupFiles: ['<rootDir>/test/integration/env.ts'],
    },
  ],
};
