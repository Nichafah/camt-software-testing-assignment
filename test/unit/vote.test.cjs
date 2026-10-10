const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVoteService } = require('../support/loadVoteService.cjs');

function fixture() {
  const user = { constituencyId: 1, constituency: { isClosed: false, province: 'เชียงใหม่', districtNumber: 1 } };
  const candidate = { id: 9, constituencyId: 1, candidateNumber: 2, user: { firstName: 'อรุณ', lastName: 'ใจดี' }, party: { id: 3, name: 'พรรคทดสอบ' } };
  const saved = { id: 4, timestamp: new Date('2026-10-10T00:00:00Z'), candidate };
  const writes = [];
  const deps = {
    users: { findById: async () => user },
    candidates: { findById: async () => candidate },
    votes: { upsertVote: async (...args) => { writes.push(args); return saved; } },
  };
  return { user, candidate, saved, writes, deps };
}

test('castVote preserves the successful response and upserts exactly once', async () => {
  const { deps, writes, saved } = fixture();
  const result = await loadVoteService(deps).castVote(7, 9);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    message: 'ลงคะแนนสำเร็จ',
    vote: { id: 4, timestamp: saved.timestamp.toISOString(), candidate: { id: 9, candidateNumber: 2, firstName: 'อรุณ', lastName: 'ใจดี', party: { id: 3, name: 'พรรคทดสอบ' } } },
  });
  assert.deepEqual(writes, [[7, 9]]);
});

for (const scenario of ['missing user', 'missing constituency', 'closed poll', 'missing candidate', 'wrong district']) {
  test(`castVote rejects ${scenario} without persisting a vote`, async () => {
    const { deps, user, candidate, writes } = fixture();
    let message;
    if (scenario === 'missing user') { deps.users.findById = async () => null; message = 'ไม่พบผู้ใช้ ID: 7'; }
    if (scenario === 'missing constituency') { user.constituencyId = 0; message = 'ผู้ใช้ยังไม่ได้ลงทะเบียนในเขตเลือกตั้ง'; }
    if (scenario === 'closed poll') { user.constituency.isClosed = true; message = 'การลงคะแนนในเขต เชียงใหม่ เขตที่ 1 ปิดแล้ว'; }
    if (scenario === 'missing candidate') { deps.candidates.findById = async () => null; message = 'ไม่พบผู้สมัคร ID: 9'; }
    if (scenario === 'wrong district') { candidate.constituencyId = 2; message = 'ผู้สมัครนี้ไม่ได้อยู่ในเขตเลือกตั้งของคุณ'; }
    await assert.rejects(loadVoteService(deps).castVote(7, 9), { message });
    assert.deepEqual(writes, []);
  });
}

test('castVote stops before candidate lookup when the poll is closed', async () => {
  const { deps, user, writes } = fixture();
  user.constituency.isClosed = true;
  deps.candidates.findById = async () => { assert.fail('closed poll must short-circuit candidate lookup'); };
  await assert.rejects(loadVoteService(deps).castVote(7, 9), /ปิดแล้ว/);
  assert.deepEqual(writes, []);
});
