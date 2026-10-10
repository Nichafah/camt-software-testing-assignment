# Lab 06 — Outside-In: ปิดหีบและประกาศผล

**Reference:** Freeman & Pryce, [Growing Object-Oriented Software, Guided by Tests](https://growing-object-oriented-software.com/) — Ch. 1, 4, 5
**เวลา:** ~150 นาที (ทั้งเช้า)

## Feature

> **ในฐานะ** กกต.
> **ฉันต้องการ** ปิดหีบเลือกตั้งของแต่ละเขต
> **เพื่อให้** ประชาชนเห็นผลคะแนนของเขตนั้น

Acceptance criteria:
1. กกต. ปิดหีบเขตได้ด้วย `POST /districts/:id/close` → `200 { districtId, closedAt }`
2. ก่อนปิดหีบ `GET /districts/:id/results` → `closed: false` และ **ไม่มี** คะแนน
3. หลังปิดหีบ → `closed: true`, `closedAt` และผู้สมัครทุกคนมี `votes` (คนที่ไม่มีใครเลือก = 0)
4. ปิดซ้ำ → `409` · ผู้มีสิทธิเลือกตั้งพยายามปิด → `403` · เขตที่ไม่มี → `404`

(การห้ามลงคะแนน *หลัง* ปิดหีบ ไว้ทำใน Lab 07 — มันอยู่ในโค้ด legacy)

## วงจรสองชั้น (double loop)

```
 ┌──────────────── outer loop: acceptance test (Playwright, e2e) ────────────────┐
 │  1. เขียน acceptance test → แดง (และแดงด้วยเหตุผลที่ "ถูก")                     │
 │     ┌──────── inner loop: component / unit test (Jest) ────────┐               │
 │     │  2. เขียน test ที่เล็กกว่า → แดง                          │               │
 │     │  3. เขียนโค้ดให้ผ่าน → เขียว                             │  วนจนกว่า       │
 │     │  4. refactor                                              │  outer เขียว   │
 │     └───────────────────────────────────────────────────────────┘               │
 └────────────────────────────────────────────────────────────────────────────────┘
```

## ขั้นตอน

### Step 1 — Acceptance test (outer loop) · 25 นาที

สร้าง `app/e2e/close-poll.spec.ts` ใช้ `ElectionApi` ใน `e2e/support/electionApi.ts` (มีให้แล้ว) เขียน journey:

1. กกต. (login ด้วย `COMMISSIONER`) สร้างพรรค 2 พรรค และผู้สมัคร 2 คนในเขต `CM-3`
2. ผู้มีสิทธิ 3 คนในเขต `CM-3` ลงคะแนน: 2 คนเลือกหมายเลข 1, 1 คนเลือกหมายเลข 2
3. ผลก่อนปิดหีบ: ไม่มีคะแนน
4. กกต. ปิดหีบ
5. ผลหลังปิดหีบ: หมายเลข 1 = 2 คะแนน, หมายเลข 2 = 1 คะแนน

```bash
npm run test:e2e
```

✅ ต้องแดง — ที่ `POST /districts/CM-3/close` ได้ 404 (ยังไม่มี route) **ไม่ใช่** แดงเพราะ setup ผิด

> *Walking skeleton:* test นี้วิ่งผ่านทุกชั้นจริง — container, Postgres, Liquibase, HTTP — ตั้งแต่วันแรก

### Step 2 — Component test ของ route · 20 นาที

สร้าง `app/test/integration/poll.test.ts` (ใช้ `givenFor` และ builders จาก Lab 04):
- กกต. ปิดหีบได้ 200 / voter ได้ 403 / ปิดซ้ำได้ 409
- ผลหลังปิดหีบนับคะแนนจากตาราง `votes` ถูกต้อง → ต้องเพิ่ม `given.vote(voter, candidate)`

แดง → เพิ่ม route `POST /districts/:id/close` ที่เรียก service ที่ **ยังไม่มีอยู่จริง** → ออกแบบ interface จากมุมคนเรียก:

```ts
interface PollService {
  close(districtId: string): Promise<{ districtId: string; closedAt: Date }>;
  resultsFor(districtId: string): Promise<DistrictResults>;
}
```

### Step 3 — Unit test ของ service (inner loop) · 40 นาที

`app/test/unit/pollService.test.ts` — ใช้ test doubles เพื่อ **ค้นพบ** ว่า service ต้องการอะไรจากโลกภายนอก:
- `Clock` (มีอยู่แล้วใน `src/clock.ts`) → `closedAt` ต้องเป็นเวลาจาก clock (ใช้ fixed clock ใน test)
- `DistrictRepository` ต้องมีเมธอดใหม่สำหรับบันทึกการปิดหีบ
- ต้องมีอะไรสักอย่างที่นับคะแนนตามผู้สมัคร → `VoteRepository` ใหม่

> GOOS: *"Listen to the tests"* — ถ้า setup ของ test ยาวและยุ่ง แปลว่า design กำลังบอกอะไรเรา

### Step 4 — Schema change ด้วย Liquibase · 15 นาที

การปิดหีบต้องเก็บใน database → changeset ใหม่ `005-district-poll-closing.sql`
- เพิ่ม column `closed_at TIMESTAMPTZ` (null = ยังไม่ปิด) ให้ `districts`
- เพิ่ม `include` ของไฟล์นี้ใน `db/changelog/db.changelog-master.yaml` **หลัง** tag `day1` และก่อน seed `900` — ถ้าลืม changeset จะไม่ถูกรันเลย และ Liquibase ไม่แจ้ง error
- **ต้องมี** `--rollback`
- `npm run db:test-rollback` ต้องผ่าน (จาก Lab 05)

### Step 5 — Implement repository จริง แล้วไล่กลับออกไป · 30 นาที

- `PgDistrictRepository`, `PgVoteRepository` → ใส่ใน `pgDeps`
- component test เขียว → acceptance test เขียว 🎉

### Step 6 — Refactor · ที่เหลือ

ทุก loop เขียวแล้ว — ตอนนี้ปลอดภัยที่จะ refactor: ย้ายการสร้าง response ของ results ออกจาก route, ตั้งชื่อให้ชัด, ลบโค้ดซ้ำ

## คำถามปิด lab

- test ระดับไหนที่ช่วยเรา **ออกแบบ** มากที่สุด? ระดับไหนช่วย **ยืนยันว่าต่อสายถูก**?
- ถ้าเขียนแบบ inside-out (เริ่มจาก table → repository → service → route) จะต่างไปอย่างไร? ความเสี่ยงคืออะไร?
- acceptance test 1 ตัวใช้เวลาเท่าไหร่ เทียบกับ unit test ทั้งหมด? ควรมี acceptance test กี่ตัว?
