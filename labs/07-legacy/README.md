# Lab 07 — Legacy Code: ห้ามลงคะแนนหลังปิดหีบ

**Reference:** Michael Feathers, *Working Effectively with Legacy Code* — Ch. 2, 4, 6, 13, 25
**เวลา:** ~120 นาที

> *"Legacy code is simply code without tests."* — Michael Feathers

## Requirement ใหม่

> หลังจาก กกต. ปิดหีบเขตใดแล้ว ผู้มีสิทธิในเขตนั้น **ลงคะแนนหรือเปลี่ยนคะแนนไม่ได้อีก** → `409 { error: 'poll is closed' }`

โค้ดที่ต้องแก้คือ `app/src/routes/voteRoutes.ts` — ไม่มี test, ใช้ `pool` global, อ่าน `process.env` เอง, เรียก `new Date()` ตรง ๆ

## The Legacy Code Change Algorithm (Feathers)

1. หา **change point** — ต้องแก้ตรงไหน
2. หา **test point** — จะสังเกตพฤติกรรมได้จากตรงไหน
3. **Break dependencies** — ทำให้โค้ดอยู่ใน test harness ได้
4. เขียน **characterization tests**
5. แก้โค้ด + refactor

## Part A — Characterization tests (35 นาที)

เปิด `app/test/integration/vote.characterization.test.ts` (setup ให้แล้ว) — ตอบ ❓ ทั้ง 2 ข้อก่อน แล้วเติม `it.todo`

วิธีเขียน characterization test:
1. เขียน test ที่ assert สิ่งที่ *คิดว่า* จะเกิด (หรือ assert ค่าที่ผิดแน่ ๆ)
2. รัน → ดูว่าจริง ๆ ระบบตอบอะไร
3. แก้ assertion ให้ตรงกับ **พฤติกรรมปัจจุบัน** — แม้จะดูแปลก (จดไว้ว่าแปลก แต่ยังไม่แก้)

เรื่องเวลา: handler เรียก `new Date()` ตรง ๆ ตอนนี้เรายังไม่มี seam → ตั้ง `opens_at` **เทียบกับเวลาจริง** แทน:
```ts
await given.electionOpenedAt(new Date(Date.now() - 60 * 60 * 1000)); // เปิดไปแล้ว 1 ชม.
```

ลองสำรวจ input แปลก ๆ: `candidateId: "abc"`, `candidateId: 0`, `candidateId: "1"` — ระบบตอบอะไร?

ลอง `jest.spyOn(console, 'log')` — handler log อะไรออกมาบ้าง? นั่นก็เป็นพฤติกรรมที่ใครบางคนอาจพึ่งพาอยู่

## Part B — Break dependencies (30 นาที)

ตอนนี้ route **ไม่มี seam** เลย: `import { pool } from '../db'` + `jwt.verify(…, process.env.JWT_SECRET)` + `new Date()`

ทำทีละขั้น และ **รัน characterization tests หลังทุกขั้น**:

1. **Parameterize Constructor** — เปลี่ยน `export default router` เป็น factory
   ```ts
   export function voteRoutes({ pool, tokens, clock }: VoteRouteDeps): Router
   ```
   แล้วให้ `createApp` ส่ง dependency เข้าไป (ตอนนี้ต้องเพิ่ม `pool` ใน `AppDeps` — เป็นหนี้ที่ยอมรับได้ชั่วคราว)
2. ใช้ `authenticate(tokens)` แทน `jwt.verify` inline — ⚠️ error message เดิมต้องเหมือนเดิม (test จะบอกเราถ้าไม่ใช่)
3. เปลี่ยน `new Date()` เป็น `clock.now()` — ตอนนี้ test ใช้ fixed clock ได้แล้ว

ตอนนี้ตอบได้ไหม: ทำไม `legacyPool.end()` ใน `afterAll` ไม่จำเป็นอีกต่อไป?

> **อีกทาง (ไม่แนะนำเป็นทางหลัก):** Jest มี *module seam* — `jest.mock('../../src/db')` แทนที่ module ทั้งก้อน หรือ `jest.useFakeTimers({ doNotFake: [...] })` ควบคุม `new Date()` โดยไม่แก้โค้ด ใช้ได้เป็นทางผ่านชั่วคราว แต่ test จะผูกกับ *โครงสร้างไฟล์* แทนพฤติกรรม

## Part C — Sprout (25 นาที)

อย่ายัด logic ใหม่ลงไปกลาง handler ยาว ๆ — **Sprout Method / Sprout Class**: เขียนโค้ดใหม่เป็นชิ้นแยกที่ test ได้ แล้วเรียกจากโค้ดเก่าจุดเดียว

1. สร้าง `app/src/domain/ballotRules.ts`:
   ```ts
   // คืนเหตุผลที่ลงคะแนนไม่ได้ หรือ null ถ้าลงได้
   export function whyBallotIsClosed(input: { now: Date; electionOpensAt: Date | null; districtClosedAt: Date | null }): string | null
   ```
2. unit test ใน `test/unit/ballotRules.test.ts` — ครอบคลุมทั้งกฎเดิม (ยังไม่เปิด / ไม่มี election) และกฎใหม่ (ปิดหีบแล้ว)
3. เรียกจาก handler แทน `if` เดิม
4. เพิ่ม test พฤติกรรมใหม่ใน characterization file: หลังปิดหีบ → 409 `poll is closed`
5. (Stretch) เพิ่มขั้นใน acceptance test ของ Lab 06: หลังปิดหีบ ผู้มีสิทธิลงคะแนนอีกไม่ได้

## คุยกัน

- characterization test ต่างจาก test ที่เขียนจาก requirement อย่างไร? เมื่อไหร่ควรลบ/เปลี่ยนมัน?
- เราเจอพฤติกรรมแปลก (เช่น `candidateId: "abc"`) — ควรแก้เลยใน PR นี้ไหม?
- ขั้นต่อไปของ `voteRoutes.ts` ควรเป็นอะไร? (ดู `VoteRepository`, `PollService` จาก Lab 06)

## ผลการทำและ Reflection

### Part A — Characterization

Change point: PUT /me/vote; test point: HTTP response, ตาราง votes และ console log.
ใช้ supertest + PostgreSQL + createGiven/builders. ก่อนแก้ production ผ่าน 13 cases:
ครั้งแรก 201/changed=false; เปลี่ยน/ลงซ้ำ 200/changed=true มีแถวเดียว; ผิดเขต 403;
ไม่พบผู้สมัคร 404; ไม่มี election/ยังไม่เปิด 409; commissioner 403; candidateId ขาด/0
400; token ขาด/ผิด 401. พบว่า "abc" ตอบ 500 แต่ string ตัวเลขใช้ได้และคืน number.
ตรวจ log ทั้ง first vote และ changed vote พร้อม ISO timestamp.
คำตอบ ❓: เดิม secret ต้องตรง process.env.JWT_SECRET เพราะ route verify JWT เอง;
legacyPool.end() จำเป็นเพราะ route ใช้ singleton คนละตัวกับ test pool.

### Part B — Break dependencies

ทำตามลำดับ: factory voteRoutes({pool,tokens,clock}) + AppDeps.pool;
authenticate(tokens) โดยรักษา authentication required; clock.now() แทน new Date().
รัน characterization หลังทุกขั้น ผ่าน 13/13 ทั้งสามครั้ง. ตอนนี้ใช้ secret ของ test เอง
และ fixed clock 2030-01-01 ได้; ไม่ต้องปิด legacyPool เพราะ route ใช้ injected pool.

### Part C — Sprout Method

whyBallotIsClosed เป็น pure function ที่ handler เรียกจุดเดียว. Unit 7 cases ตรวจไม่มี
 election, ก่อนเปิด 1ms, ตรงเวลาเปิด, หลังเปิด, ปิดหีบ และ precedence ของกฎเดิม.
Component tests ปิดผ่าน commissioner API แล้วตรวจ first vote/เปลี่ยนผู้สมัครถูกปฏิเสธ
409 {error:'poll is closed'}, DB คงเดิม และไม่มี vote log; เขตอื่นยังลงได้.
E2E เพิ่ม rejection ทั้ง first/change หลังปิด และผลคะแนนคงเดิม 2 ต่อ 1.

Characterization บันทึกพฤติกรรมจริง ส่วน requirement test ระบุพฤติกรรมที่ต้องการ.
เปลี่ยน characterization เมื่ออนุมัติเปลี่ยนสัญญา; ลบเมื่อ test อื่นครอบคลุมสัญญาเพียงพอ.
ไม่แก้ "abc" ในงานนี้เพราะจะปน input validation กับ requirement ปิดหีบ.
ขั้นต่อไป: ย้าย SQL ไป VoteRepository และ orchestration ไป PollService; เพิ่ม transaction/
locking และ concurrency test สำหรับ race ระหว่างปิดหีบกับ vote ที่กำลังทำงาน.
Tests ปัจจุบันพิสูจน์ request หลังปิดสำเร็จ ไม่ได้พิสูจน์ concurrent close/vote.

### หลักฐานการตรวจสอบ

- npm run typecheck: ผ่าน
- npm run test:unit: 11 suites, 61 tests ผ่าน
- npm run test:integration: 4 suites, 29 tests ผ่าน
- npm run test:e2e: 2 tests ผ่าน

ผลจากการรันจริงในเครื่อง ไม่ใช่สถานะ GitHub Actions.
- Database: สร้าง db-test เปล่าแล้วรัน db:test-rollback (update-testing-rollback)
  และ integration อีกครั้ง เพื่อไม่ให้ตรวจ rollback บนฐานข้อมูลที่ไม่มี changeset ค้าง.
