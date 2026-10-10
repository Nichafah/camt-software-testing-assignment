// Lab 08 / Lab 01 case 14: app + real PostgreSQL, no HTTP listener.
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { aCandidate, aParty, aVoter } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { createGiven } from './support/given';

describe('own project: district ballot and selected vote (component)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof createGiven>;
  const now = new Date('2030-01-01T00:00:00Z');

  beforeAll(() => {
    pool = createTestPool();
    const tokens = new JwtTokenService('own-project-secret');
    app = createApp(pgDeps(pool, tokens, { clock: { now: () => now } }));
    given = createGiven(pool, tokens);
  });
  beforeEach(async () => { await truncateAll(pool); });
  afterAll(async () => { await pool.end(); });

  it('shows only district candidates, ordered by number, and selects only this voter’s vote', async () => {
    // Arrange: two local candidates, a foreign candidate, and another voter’s vote.
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    const otherVoter = await given.user(aVoter().inDistrict('CM-1'));
    const party1 = await given.party(aParty());
    const party2 = await given.party(aParty());
    const second = await given.candidate(aCandidate().forParty(party2.id).inDistrict('CM-1').numbered(2));
    const first = await given.candidate(aCandidate().forParty(party1.id).inDistrict('CM-1').numbered(1));
    await given.candidate(aCandidate().forParty(party1.id).inDistrict('CM-2').numbered(1));
    await pool.query('INSERT INTO election (id, opens_at) VALUES (1, $1)', [now]);
    expect((await request(app).put('/me/vote').set(given.authHeader(otherVoter)).send({ candidateId: second.id })).status).toBe(201);

    // Act / Assert: the other voter’s ballot must not mark this voter’s candidates.
    const before = await request(app).get('/me/candidates').set(given.authHeader(voter));
    expect(before.status).toBe(200);
    expect(before.body).toEqual([
      { id: first.id, number: 1, name: `${first.firstName} ${first.lastName}`, party: party1.name, selected: false },
      { id: second.id, number: 2, name: `${second.firstName} ${second.lastName}`, party: party2.name, selected: false },
    ]);
    const vote = await request(app).put('/me/vote').set(given.authHeader(voter)).send({ candidateId: first.id });
    expect(vote.status).toBe(201);
    const after = await request(app).get('/me/candidates').set(given.authHeader(voter));
    expect(after.status).toBe(200);
    expect(after.body).toEqual(before.body.map((candidate: { id: number }) => ({ ...candidate, selected: candidate.id === first.id })));
    expect((await pool.query('SELECT candidate_id FROM votes WHERE voter_id = $1', [voter.id])).rows).toEqual([{ candidate_id: first.id }]);
  });
});
