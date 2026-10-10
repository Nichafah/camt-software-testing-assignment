import request from 'supertest';
import { Pool } from 'pg';
import { createApp, pgDeps } from '../../src/app';
import { JwtTokenService } from '../../src/auth/tokenService';
import { PgUserRepository } from '../../src/repositories/userRepository';
import { aCandidate, aCommissioner, aParty, aVoter, anAdmin } from '../support/builders';
import { createTestPool, truncateAll } from './support/database';
import { createGiven } from './support/given';

describe('election management (component)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let given: ReturnType<typeof createGiven>;

  beforeAll(() => {
    pool = createTestPool();
    const tokens = new JwtTokenService('test-secret');
    app = createApp(pgDeps(pool, tokens));
    given = createGiven(pool, tokens);
  });

  // Fresh Fixture: ทุก test เริ่มจากฐานข้อมูลว่าง (เหลือแต่ข้อมูลอ้างอิงอย่างเขตเลือกตั้ง)
  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /parties', () => {
    it('lets a commissioner create a party', async () => {
      const commissioner = await given.user(aCommissioner());
      const newParty = aParty().build();

      const response = await request(app)
        .post('/parties')
        .set(given.authHeader(commissioner))
        .send({ name: newParty.name, policy: newParty.policy });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: newParty.name, policy: newParty.policy });
    });

    it('forbids a voter (403)', async () => {
      const voter = await given.user(aVoter());
      const newParty = aParty().build();

      const response = await request(app)
        .post('/parties')
        .set(given.authHeader(voter))
        .send({ name: newParty.name, policy: newParty.policy });

      expect(response.status).toBe(403);
    });

    it('requires a token (401)', async () => {
      const newParty = aParty().build();

      const response = await request(app).post('/parties').send({ name: newParty.name, policy: newParty.policy });

      expect(response.status).toBe(401);
    });

    it('rejects a duplicate party name (409)', async () => {
      const commissioner = await given.user(aCommissioner());
      await given.party(aParty().named('พรรคก้าวหน้า')); // ชื่อนี้สำคัญกับ test จึงระบุเอง

      const response = await request(app)
        .post('/parties')
        .set(given.authHeader(commissioner))
        .send({ name: 'พรรคก้าวหน้า', policy: 'นโยบายอื่น' });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /districts/:id/candidates', () => {
    it('adds a candidate that then appears in the public results of that district', async () => {
      const commissioner = await given.user(aCommissioner());
      const party = await given.party(aParty());
      const candidate = { partyId: party.id, number: 3, firstName: 'อรุณ', lastName: 'ศรีเจริญ' };

      // Act: ขั้นเพิ่มผู้สมัคร แล้วขั้นดูผลสาธารณะ ถือเป็นพฤติกรรมเดียวต่อเนื่องกัน
      const added = await request(app)
        .post('/districts/CM-1/candidates')
        .set(given.authHeader(commissioner))
        .send(candidate);
      const results = await request(app).get('/districts/CM-1/results');

      expect(added.status).toBe(201);
      expect(results.status).toBe(200);
      expect(results.body.candidates).toEqual([
        { number: 3, firstName: 'อรุณ', lastName: 'ศรีเจริญ', partyName: party.name },
      ]);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('lets an admin promote a voter to commissioner', async () => {
      const admin = await given.user(anAdmin());
      const voter = await given.user(aVoter());

      const response = await request(app)
        .patch(`/admin/users/${voter.id}/role`)
        .set(given.authHeader(admin))
        .send({ role: 'COMMISSIONER' });

      const stored = await new PgUserRepository(pool).findById(voter.id);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: voter.id, role: 'COMMISSIONER' });
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(stored?.role).toBe('COMMISSIONER');
    });
  });

  describe('GET /me/candidates', () => {
    it('shows a voter only the candidates of their own district', async () => {
      const voter = await given.user(aVoter().inDistrict('CM-2'));
      const partyA = await given.party(aParty());
      const partyB = await given.party(aParty());
      await given.candidate(aCandidate().inDistrict('CM-1').forParty(partyA.id).numbered(1));
      await given.candidate(aCandidate().inDistrict('CM-2').forParty(partyB.id).numbered(2));

      const response = await request(app).get('/me/candidates').set(given.authHeader(voter));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ number: 2, party: partyB.name });
    });
  });
});