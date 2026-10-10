// Runs before every integration test file, before your app reads process.env.
// Use the variable names YOUR project reads (DATABASE_URL, DB_HOST, …).
process.env.DATABASE_URL ??= 'postgres://app:app@localhost:5433/app_test';
process.env.JWT_SECRET ??= 'test-secret';
