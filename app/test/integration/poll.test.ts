import request from 'supertest';
import { Pool } from 'pg';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { aCommissioner, aVoter, aParty, aCandidate } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { createGiven } from './support/given';

describe('poll closing (component)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof createGiven>;

  beforeAll(() => {
    pool = createTestPool();
    const tokens = new JwtTokenService('test-secret');
    app = createApp(pgDeps(pool, tokens));
    given = createGiven(pool, tokens);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('allows a commissioner to close a district poll (200)', async () => {
    const commissioner = await given.user(aCommissioner());

    const response = await request(app)
      .post('/districts/CM-1/close')
      .set(given.authHeader(commissioner));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ districtId: 'CM-1' });
    expect(response.body.closedAt).toBeTruthy();
  });

  it('forbids a voter from closing a poll (403)', async () => {
    const voter = await given.user(aVoter());

    const response = await request(app)
      .post('/districts/CM-1/close')
      .set(given.authHeader(voter));

    expect(response.status).toBe(403);
  });

  it('rejects closing an already closed poll (409)', async () => {
    const commissioner = await given.user(aCommissioner());

    await request(app)
      .post('/districts/CM-1/close')
      .set(given.authHeader(commissioner));

    const response = await request(app)
      .post('/districts/CM-1/close')
      .set(given.authHeader(commissioner));

    expect(response.status).toBe(409);
  });

  it('returns 404 when the district does not exist', async () => {
    const commissioner = await given.user(aCommissioner());

    const response = await request(app)
      .post('/districts/UNKNOWN/close')
      .set(given.authHeader(commissioner));

    expect(response.status).toBe(404);
  });

  it('publishes vote counts after closing the poll', async () => {
    const commissioner = await given.user(aCommissioner());
    const party1 = await given.party(aParty());
    const party2 = await given.party(aParty());

    await given.candidate(
      aCandidate().inDistrict('CM-1').forParty(party1.id).numbered(1),
    );
    await given.candidate(
      aCandidate().inDistrict('CM-1').forParty(party2.id).numbered(2),
    );

    const before = await request(app).get('/districts/CM-1/results');

    expect(before.status).toBe(200);
    expect(before.body.closed).toBe(false);

    for (const candidate of before.body.candidates) {
      expect(candidate).not.toHaveProperty('votes');
    }

    const closed = await request(app)
      .post('/districts/CM-1/close')
      .set(given.authHeader(commissioner));

    expect(closed.status).toBe(200);

    const after = await request(app).get('/districts/CM-1/results');

    expect(after.status).toBe(200);
    expect(after.body.closed).toBe(true);
    expect(after.body.closedAt).toBeTruthy();

    expect(after.body.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ number: 1, votes: 0 }),
        expect.objectContaining({ number: 2, votes: 0 }),
      ]),
    );
  });
});