import { expect, test } from '@playwright/test';
import { COMMISSIONER, ElectionApi } from './support/electionApi';

test('commissioner closes the poll and publishes district results', async ({ request }) => {
  const api = new ElectionApi(request);
  const districtId = 'CM-3';
  const runId = `${Date.now()}-${process.pid}`;

  // 1. กกต. เข้าสู่ระบบ
  const commissionerToken = await api.login(COMMISSIONER);

  // 2. สร้างพรรค 2 พรรค
const party1 = await api.createParty(
  commissionerToken,
  `Lab06 Green Lanna ${runId}`,
);

const party2 = await api.createParty(
  commissionerToken,
  `Lab06 Ping River ${runId}`,
);

  // 3. เพิ่มผู้สมัครหมายเลข 1 และ 2
  const candidate1 = await api.addCandidate(commissionerToken, districtId, party1.id, 1);
  const candidate2 = await api.addCandidate(commissionerToken, districtId, party2.id, 2);

  // 4. สร้างผู้มีสิทธิเลือกตั้ง 3 คน
  const voter1 = await api.newVoterIn(districtId);
  const voter2 = await api.newVoterIn(districtId);
  const voter3 = await api.newVoterIn(districtId);

  // 5. ลงคะแนน: หมายเลข 1 ได้ 2 คะแนน, หมายเลข 2 ได้ 1 คะแนน
  expect((await api.vote(voter1, candidate1.id)).status()).toBe(201);
  expect((await api.vote(voter2, candidate1.id)).status()).toBe(201);
  expect((await api.vote(voter3, candidate2.id)).status()).toBe(201);

  // 6. ก่อนปิดหีบ ต้องไม่เปิดเผยคะแนน
  const before = await api.results(districtId);
  expect(before.status()).toBe(200);

  const beforeBody = await before.json();
  expect(beforeBody.closed).toBe(false);
  expect(beforeBody.candidates).toHaveLength(2);

  for (const candidate of beforeBody.candidates) {
    expect(candidate).not.toHaveProperty('votes');
  }

// 7. กกต. ปิดหีบ ต้องได้รับ HTTP 200
  const closed = await request.post(`/districts/${districtId}/close`, {
    headers: { Authorization: `Bearer ${commissionerToken}` },
  });

  // Acceptance criteria ต้องการ 200
  expect(closed.status()).toBe(200);

  const closedBody = await closed.json();
  expect(closedBody.districtId).toBe(districtId);
  expect(closedBody.closedAt).toBeTruthy();

  // Lab 07: reject both a changed vote and a first vote after closing.
  const voter4 = await api.newVoterIn(districtId);
  for (const voter of [voter1, voter4]) {
    const rejected = await api.vote(voter, candidate2.id);
    expect(rejected.status()).toBe(409);
    expect(await rejected.json()).toEqual({ error: 'poll is closed' });
  }

  // 8. หลังปิดหีบ ต้องแสดงคะแนน
  const after = await api.results(districtId);
  expect(after.status()).toBe(200);

  const afterBody = await after.json();
  expect(afterBody.closed).toBe(true);
  expect(afterBody.closedAt).toBeTruthy();

  const candidateNumber1 = afterBody.candidates.find(
    (candidate: { number: number }) => candidate.number === 1,
  );
  const candidateNumber2 = afterBody.candidates.find(
    (candidate: { number: number }) => candidate.number === 2,
  );

  expect(candidateNumber1.votes).toBe(2);
  expect(candidateNumber2.votes).toBe(1);
});