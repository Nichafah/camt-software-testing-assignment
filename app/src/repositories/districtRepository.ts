import { Pool } from 'pg';
import { District } from '../domain/types';

export interface DistrictRepository {
  findAll(): Promise<District[]>;
  findById(id: string): Promise<District | null>;
  close(id: string, closedAt: Date): Promise<boolean>;
}

export class PgDistrictRepository implements DistrictRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<District[]> {
    const { rows } = await this.pool.query<District>(
      `SELECT id, province, number,
              closed_at AS "closedAt"
       FROM districts
       ORDER BY province, number`,
    );

    return rows;
  }

  async findById(id: string): Promise<District | null> {
    const { rows } = await this.pool.query<District>(
      `SELECT id, province, number,
              closed_at AS "closedAt"
       FROM districts
       WHERE id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  async close(id: string, closedAt: Date): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE districts
       SET closed_at = $2
       WHERE id = $1
         AND closed_at IS NULL`,
      [id, closedAt],
    );

    return result.rowCount === 1;
  }
}