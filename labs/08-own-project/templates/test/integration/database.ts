import { Pool } from 'pg';

export function createTestPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/** List every table a test can write to. Keep reference data out of the list. */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE example RESTART IDENTITY CASCADE');
}
