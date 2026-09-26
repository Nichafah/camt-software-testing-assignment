# Lab 04 — Test Data Management

**Reference:** xUnit Test Patterns — *Fresh Fixture*, *Shared Fixture*, *Test Data Builder*, *Creation Method*; Liquibase docs
**เวลา:** ~75 นาที

## Part A — Database versioning ด้วย Liquibase (20 นาที)

schema คือโค้ด: อยู่ใน git, มี version, apply แบบเดียวกันทุก environment (dev, test, CI, production)

```bash
cd app
npm run db:up:test && npm run db:migrate:test

# 1. ดูสถานะและประวัติ
docker compose run --rm --build liquibase status --verbose
docker compose run --rm liquibase history

# 2. Liquibase จำอะไรไว้ใน database?
docker compose exec db-test psql -U election -d election_test \
  -c "SELECT id, author, filename, md5sum, contexts FROM databasechangelog ORDER BY orderexecuted"
```

**A1 — Tag แล้ว rollback**
1. `docker compose run --rm liquibase tag --tag=lab04-start`
2. สร้าง `db/changelog/changes/005-practice.sql` เพิ่ม column `slogan TEXT` ให้ `parties` พร้อม `--rollback`
3. `npm run db:migrate:test` → ตรวจว่า column มาแล้ว
4. `docker compose run --rm --build liquibase rollback --tag=lab04-start` → column หายไหม?
5. ลบไฟล์ 005 ทิ้ง (lab นี้ไม่เก็บ)

**A2 — แก้ changeset ที่รันไปแล้ว**
1. แก้ `003-parties-candidates.sql` เล็กน้อย (เช่นเปลี่ยน `policy TEXT NOT NULL` เป็น `policy TEXT`)
2. `npm run db:migrate:test` — เกิดอะไรขึ้น? ทำไม Liquibase ถึงป้องกันเรื่องนี้?
3. `git checkout -- db/` เพื่อแก้คืน → ถ้าต้องเปลี่ยน schema จริง ๆ ต้องทำอย่างไร?

**A3 — Contexts:** ทำไม dev database มีผู้ใช้ตัวอย่าง แต่ test database ไม่มี? (ดู `900-dev-seed.sql` และ `LIQUIBASE_COMMAND_CONTEXTS` ใน `docker-compose.yml`)

## Part B — Test Data Builders + faker (25 นาที)

ปัญหา: component test ต้องการ user, พรรค, ผู้สมัคร — ถ้าเขียน object เต็ม ๆ ทุก test จะยาว และ **ไม่รู้ว่าค่าไหนสำคัญกับ test นั้น**

```ts
// ❌ ค่าไหนสำคัญ?
await users.create({ nationalId: '1509900000017', passwordHash: '...', firstName: 'สมชาย',
                     lastName: 'ใจดี', address: '...', districtId: 'CM-2' });

// ✅ บอกเฉพาะสิ่งที่สำคัญ — ที่เหลือ builder เติมให้ (ด้วย faker)
const voter = await given.user(aVoter().inDistrict('CM-2'));
```

สร้าง `app/test/support/builders.ts`:
- `aVoter()`, `aCommissioner()`, `anAdmin()` → `.inDistrict(id)`, `.withNationalId(id)`, `.build()`
- `aParty()` → `.named(name)`, `.build()`
- `aCandidate()` → `.inDistrict(id)`, `.forParty(partyId)`, `.numbered(n)`, `.build()`
- ค่าที่ไม่สำคัญใช้ `fakerTH` (ชื่อไทย) และเลขบัตรต้อง **checksum ถูกต้อง** เสมอ

**ทำให้ faker deterministic:** ถ้า test แดงเพราะข้อมูลสุ่ม ต้องทำซ้ำได้ → `faker.seed(...)` ใน `beforeEach` (ใส่ใน `setupFilesAfterEnv` ของ jest config)

⚠️ ระวัง: `hashPassword` ช้าโดยตั้งใจ (scrypt) — builder ควรใช้ hash ที่คำนวณไว้แล้วเป็นค่า default

## Part C — Component tests + isolation (30 นาที)

สร้าง `app/test/integration/support/given.ts` — helper ที่รับ builder แล้ว insert ผ่าน repository จริง และ `authHeader(user)` ที่ออก token ด้วย `JwtTokenService` ตัวเดียวกับ app (ไม่ต้อง login ผ่าน API ทุก test)

แล้วเติม `test/integration/elections.test.ts` ให้ครบทุก `it.todo`

Isolation:
- `beforeEach` → `truncateAll(pool)` — ทุก test เริ่มจาก database ว่าง (*Fresh Fixture*)
- ลองรัน test ไฟล์เดียว, รันซ้ำ, หรือ `--randomize` → ต้องผ่านเหมือนเดิม
  ```bash
  npx jest --selectProjects integration --runInBand --randomize
  ```

## คุยกัน: Shared Fixture (anti-pattern ที่เจอบ่อยมาก)

ถ้าใช้ `900-dev-seed.sql` เป็นข้อมูลสำหรับทุก test:
- test A แก้ vote ของ "สมชาย" → test B ที่นับคะแนนพังเฉพาะตอนรันต่อจาก A
- มีคนเพิ่มผู้สมัครใน seed → test 12 ตัวที่นับจำนวนผู้สมัครพังพร้อมกัน
- อ่าน test แล้วไม่รู้ว่า "ผู้สมัครหมายเลข 2" มาจากไหน (*Mystery Guest*)

## Stretch — Contract test สำหรับ fake

จาก Lab 03: จะมั่นใจได้อย่างไรว่า `InMemoryPartyRepository` ทำงานเหมือน `PgPartyRepository`?
เขียน test ชุดเดียวแล้วรันกับทั้งสองตัวด้วย `describe.each`
