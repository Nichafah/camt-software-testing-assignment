// Lab 07 — pin down what PUT /me/vote does TODAY, before changing it.
// A characterization test records current behaviour, even when it looks wrong.
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { User } from '../../src/domain/types';
import { createTestPool, truncateAll } from './support/database';
import { createGiven } from './support/given';
import { aVoter, aParty, aCandidate, aCommissioner } from '../support/builders';

describe('PUT /me/vote (characterization)', () => {
  // ❓ Before Part B the secret had to match process.env.JWT_SECRET because
  // the legacy route verified JWT inline. Now the injected service owns it.
  const tokens = new JwtTokenService('characterization-injected-secret');
  const as = (user: User) => given.authHeader(user);
  const fixedNow = new Date('2030-01-01T00:00:00Z');
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof createGiven>;

  beforeAll(() => {
    pool = createTestPool();
    app = createApp(pgDeps(pool, tokens, { clock: { now: () => fixedNow } }));
    given = createGiven(pool, tokens);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
    // ❓ The legacy singleton previously needed end() too. After Part B,
    // only the injected test pool owns connections.
  });

  it('records a first vote (201, changed: false)', async () => {
    // Arrange: เตรียมข้อมูลทดสอบ
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    const party = await given.party(aParty());
    const candidate = await given.candidate(
      aCandidate().forParty(party.id).inDistrict('CM-1').numbered(1)
    );

    // กำหนดให้การเลือกตั้งเปิดแล้ว 1 ชั่วโมง
    await pool.query(
      'INSERT INTO election (id, opens_at) VALUES (1, $1)',
      [new Date(fixedNow.getTime() - 60 * 60 * 1000)]
    );

    // Act: ส่งคำขอลงคะแนน
    const response = await request(app)
      .put('/me/vote')
      .set(as(voter))
      .send({ candidateId: candidate.id });

    // Assert: ตรวจสอบ HTTP Response
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      candidateId: candidate.id,
      changed: false,
      votedAt: expect.any(String),
    });

    // Assert: ตรวจสอบข้อมูลคะแนนในฐานข้อมูล
    const result = await pool.query(
      'SELECT candidate_id FROM votes WHERE voter_id = $1',
      [voter.id]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].candidate_id).toBe(candidate.id);
  });
  async function fixture() {
    const voter = await given.user(aVoter().inDistrict('CM-1'));
    const party = await given.party(aParty());
    const candidate = await given.candidate(aCandidate().forParty(party.id).inDistrict('CM-1').numbered(1));
    await pool.query('INSERT INTO election (id, opens_at) VALUES (1, $1)', [new Date(fixedNow.getTime() - 3600000)]);
    return { voter, party, candidate };
  }

  it('changes an existing vote and keeps one row, including when repeated', async () => {
    const { voter, candidate } = await fixture();
    const otherParty = await given.party(aParty());
    const other = await given.candidate(aCandidate().forParty(otherParty.id).inDistrict('CM-1').numbered(2));
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const first = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });
      expect(first.status).toBe(201);
      expect(log).toHaveBeenCalledWith(`[vote] voter ${voter.id} voted for ${candidate.id} at ${first.body.votedAt}`);
      for (const id of [other.id, other.id]) {
        const changed = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: id });
        expect(changed.status).toBe(200);
        expect(changed.body).toEqual({ candidateId: id, changed: true, votedAt: expect.any(String) });
        expect(log).toHaveBeenLastCalledWith(`[vote] voter ${voter.id} changed vote to ${id} at ${changed.body.votedAt}`);
      }
      expect((await pool.query('SELECT candidate_id FROM votes WHERE voter_id = $1', [voter.id])).rows).toEqual([{ candidate_id: other.id }]);
    } finally { log.mockRestore(); }
  });

  it.each([
    ['other district', 403, 'candidate is not in your district'],
    ['unknown', 404, 'candidate not found'],
    ['future election', 409, 'election is not open'],
    ['no election', 409, 'election is not open'],
    ['commissioner', 403, 'only voters can vote'],
    ['missing candidate', 400, 'candidateId is required'],
    ['zero', 400, 'candidateId is required'],
    ['missing token', 401, 'authentication required'],
    ['invalid token', 401, 'authentication required'],
    ['abc', 500, 'internal server error'],
  ])('records %s', async (scenario, status, error) => {
    const { voter, party, candidate } = await fixture();
    let user = voter;
    let candidateId: unknown = candidate.id;
    if (scenario === 'other district') candidateId = (await given.candidate(aCandidate().forParty(party.id).inDistrict('CM-2').numbered(1))).id;
    if (scenario === 'unknown') candidateId = 999999;
    if (scenario === 'future election') await pool.query("UPDATE election SET opens_at = $1", [new Date('2031-01-01T00:00:00Z')]);
    if (scenario === 'no election') await pool.query('DELETE FROM election');
    if (scenario === 'commissioner') user = await given.user(aCommissioner());
    if (scenario === 'missing candidate') candidateId = undefined;
    if (scenario === 'zero') candidateId = 0;
    if (scenario === 'abc') candidateId = 'abc';
    const call = request(app).put('/me/vote');
    if (scenario !== 'missing token') call.set(scenario === 'invalid token' ? { Authorization: 'Bearer invalid' } : as(user));
    const response = await call.send({ candidateId });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error });
    expect((await pool.query('SELECT * FROM votes')).rows).toHaveLength(0);
  });

  it('accepts a numeric string candidateId and returns a number', async () => {
    const { voter, candidate } = await fixture();
    const response = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: String(candidate.id) });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ candidateId: candidate.id, changed: false, votedAt: expect.any(String) });
  });
  it.each([false, true])('refuses a vote after district closure (existing vote: %s)', async (existing) => {
    const { voter, candidate } = await fixture();
    if (existing) expect((await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id })).status).toBe(201);
    const anotherParty = await given.party(aParty());
    const anotherCandidate = await given.candidate(aCandidate().forParty(anotherParty.id).inDistrict('CM-1').numbered(2));
    const before = (await pool.query('SELECT * FROM votes ORDER BY voter_id')).rows;
    const commissioner = await given.user(aCommissioner());
    expect((await request(app).post('/districts/CM-1/close').set(as(commissioner))).status).toBe(200);
    const log = jest.spyOn(console, 'log');
    try {
      const response = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: anotherCandidate.id });
      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'poll is closed' });
      expect((await pool.query('SELECT * FROM votes ORDER BY voter_id')).rows).toEqual(before);
      expect(log).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it('keeps another district open when CM-2 is closed', async () => {
    const { voter, candidate } = await fixture();
    await pool.query('UPDATE districts SET closed_at = $1 WHERE id = $2', [new Date(), 'CM-2']);
    const response = await request(app).put('/me/vote').set(as(voter)).send({ candidateId: candidate.id });
    expect(response.status).toBe(201);
    expect(response.body.votedAt).toBe('2030-01-01T00:00:00.000Z');
  });

});
