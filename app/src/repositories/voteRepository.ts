import { Pool } from 'pg';

export interface VoteRepository {
  countByCandidate(candidateId: number): Promise<number>;
}

export class PgVoteRepository implements VoteRepository {
  constructor(private readonly pool: Pool) {}

  async countByCandidate(candidateId: number): Promise<number> {
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM votes
       WHERE candidate_id = $1`,
      [candidateId],
    );

    return Number(rows[0].total);
  }
}