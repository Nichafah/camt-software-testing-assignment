# Lab 08 — นำไปใช้กับโปรเจกต์ของตัวเอง

**เวลา:** ~60 นาที · ทำในโปรเจกต์ระบบเลือกตั้งที่เขียนในวิชา backend

เป้าหมายไม่ใช่ "ครบทุกอย่าง" แต่คือ **ได้ test ของจริง 2–3 ตัวที่รันด้วยคำสั่งเดียว** และรู้ว่าขั้นต่อไปคืออะไร

## Step 1 — Test harness (15 นาที)

ใน branch ใหม่ของโปรเจกต์ตัวเอง:

```bash
git switch -c testing-workshop
npm i -D jest ts-jest @types/jest supertest @types/supertest @faker-js/faker@9
```

คัดลอกจาก [`templates/`](templates/) แล้วปรับให้เข้ากับโปรเจกต์:

| ไฟล์ | ทำอะไร |
|---|---|
| `jest.config.js` | แยก `unit` / `integration` projects |
| `docker-compose.test.yml` | Postgres สำหรับ test + Liquibase |
| `db/Dockerfile`, `db/changelog/…` | migration แบบ versioned |
| `test/integration/env.ts`, `database.ts` | ชี้ไป test DB + truncate |
| `package-scripts.json` | script ที่ต้องเพิ่มใน `package.json` |

⚠️ ถ้าโปรเจกต์ใช้ stack อื่น — หลักการเดียวกัน เปลี่ยนแค่เครื่องมือ:
- **JavaScript (ไม่ใช่ TS):** ไม่ต้องใช้ `ts-jest` ลบ `transform` ออกจาก config
- **มี migration อยู่แล้ว** (Prisma Migrate, Sequelize, TypeORM, Knex): ใช้ของเดิม ไม่ต้องย้ายมา Liquibase — สิ่งสำคัญคือ test DB ต้องสร้างจาก migration อัตโนมัติ
- **MongoDB:** ใช้ `mongo:7` ใน compose แทน Postgres; ล้างข้อมูลด้วย `db.dropDatabase()` หรือ `deleteMany({})` ต่อ collection
- **ไม่มี `createApp()`** (สร้าง app และ `listen()` ในไฟล์เดียว) → นี่คือ *seam* แรกที่ต้องสร้าง: แยก `app.ts` (สร้างและ export app) ออกจาก `server.ts` (listen) — supertest ต้องการแค่ app

## Step 2 — Characterize ก่อน (20 นาที)

เลือก **1 endpoint ที่สำคัญที่สุด** (มักเป็นการลงคะแนน) แล้วเขียน characterization test 3–4 ตัว แบบ Lab 07:
- happy path
- 1–2 กรณีที่ถูกปฏิเสธ
- พฤติกรรมแปลกที่เจอ (ถ้ามี) — จดไว้ ยังไม่ต้องแก้

## Step 3 — Automate test cases ที่เตรียมมา (20 นาที)

จาก test cases ที่จัด boundary ไว้ใน Lab 01:
1. เลือก 1 ข้อที่เป็น **unit** → ถ้า logic ฝังอยู่ใน route ให้ *sprout* ออกมาเป็นฟังก์ชันก่อน
2. เลือก 1 ข้อที่เป็น **component** → supertest + test DB + builder

## Step 4 — Readiness Checklist รอบสอง (5 นาที)

ให้คะแนนใน [`checklist/`](../../checklist/) อีกครั้ง — คะแนนเปลี่ยนจากเช้า Day 1 เท่าไหร่? ข้อไหนที่จะทำต่อเป็นอย่างแรกหลัง workshop?

## ติดตรงไหน? คำถามที่ช่วยได้

- "ถ้าจะ test สิ่งนี้ ต้อง *ควบคุม* อะไรบ้าง?" (เวลา, DB, token, service ภายนอก) → แต่ละอย่างคือ seam ที่ต้องมี
- "test นี้ต้องการ database จริงไหม หรือ logic แยกออกมาได้?"
- "ถ้า test นี้แดง ฉันจะรู้ไหมว่าอะไรพัง?"

## ผลการนำไปใช้กับโปรเจกต์นี้

ใช้ repository นี้เป็นโปรเจกต์ส่งตามการยืนยันของเจ้าของงาน และสร้าง branch
`testing-workshop` ต่อจากงาน Lab 07 โดยไม่อ่านหรือคัดลอก solution branches.

### Step 1 — Harness

ใช้ harness ที่มีแล้ว ไม่ติดตั้งหรือสร้าง migration ซ้ำ: app/jest.config.js แยก unit /
integration; app/docker-compose.yml มี db-test แยกจาก dev และ db-e2e;
app/db/Dockerfile + db/changelog ใช้ Liquibase versioned migrations;
test/integration/env.ts ชี้ port 5433, support/database.ts truncate และ reset closed_at;
createApp(pgDeps(...)) แยกจาก server.ts/listen และ inject pool/token/clock ได้.
ตรวจเทียบ templates จาก branch โจทย์; stack เดียวกันจึงใช้โครงสร้างเดิมที่มีหน้าที่เทียบเท่า.
คำสั่งเดียวจาก app/: `npm run test:all` ตรวจ typecheck, unit, component และ E2E.

### Step 2 — Characterize endpoint สำคัญ

เลือก PUT /me/vote ใช้ characterization ที่ทำก่อน refactor ใน Lab 07 ต่อโดยไม่สร้าง
assertions ซ้ำ: happy path 201; ปฏิเสธผิดเขต 403/ไม่มี election 409; พฤติกรรมแปลก
candidateId="abc" เป็น 500, numeric string ใช้ได้, vote ซ้ำยัง changed=true.
หลักฐาน: test/integration/vote.characterization.test.ts และขั้น A–B ใน Lab 07.
พฤติกรรมแปลกยังไม่แก้ และแยก requirement ปิดหีบออกจาก characterization เดิม.

### Step 3 — Automate จาก Lab 01

| Lab 01 case | Boundary / หลักฐาน | สิ่งที่ตรวจ |
|---|---|---|
| #1 checksum เลขบัตรผิด | Unit: test/unit/thaiNationalId.test.ts | เพิ่ม wrong-checksum ทั้ง 9 digits ของ prefix ที่รู้คำตอบ 7; ไม่มี DB, ไม่คำนวณ oracle ด้วย production algorithm |
| #14 เห็นผู้สมัครเฉพาะเขต | Component: test/integration/own-project.test.ts | supertest + DB จริง + builders; foreign district ไม่รั่ว, เรียงหมายเลข, คะแนนคนอื่นไม่ทำให้ selected=true และคะแนนตนเองแสดงถูกต้อง |
| #16 ห้ามเปลี่ยนคะแนนหลังปิด | Unit + component + E2E จาก Lab 07 | pure sprout ballotRules และ HTTP/DB/acceptance evidence |

ใช้ AAA, fresh fixture ทุก test, faker seed จาก harness, fixed Clock และ TokenService
ที่ test เป็นเจ้าของ. Component ตรวจ query/join จริง ไม่ mock SQL หรือ PostgreSQL.
กรณี checksum มี pure function อยู่แล้วจึงไม่ต้อง sprout ซ้ำ; ballotRules คือ sprout
ที่นำกฎจาก legacy handler ออกมาทดสอบโดยไม่มี I/O.

### Step 4 — Readiness และงานถัดไป

ดู checklist/README.md รอบสองพร้อมหลักฐานรายข้อ. รอบแรกไม่มีคะแนนบันทึกไว้ จึงไม่
อ้างผลต่างเชิงตัวเลข; ความเปลี่ยนแปลงที่พิสูจน์ได้ในงานนี้คือ characterization,
seams ของ legacy route, sprout และคำสั่ง test:all. งานแรกหลัง workshop คือย้าย SQL
จาก voteRoutes ไป VoteRepository/PollService และเพิ่ม concurrent close/vote test
พร้อม transaction/locking. อีกงานคือกำหนด input validation สำหรับ "abc" ให้เป็น
400 ผ่าน requirement ใหม่ แทนเปลี่ยนพฤติกรรมเงียบ ๆ.

### Validation

- `npm run test:all`: typecheck ผ่าน, unit 11 suites / 70 tests,
  integration 5 suites / 30 tests, E2E 2 tests.
- `npm run test:coverage`: ผ่าน thresholds เดิม; statements 88.34%, branches 84.05%,
  functions 100%, lines 91.95% (ขอบเขต domain/services ตาม Jest config).
- Lab 07 ตรวจ migration จาก db-test ใหม่ด้วย update-testing-rollback แล้ว integration ผ่าน.
- เก็บ README และ templates ต้นฉบับจาก upstream/jest/lab/08-own-project เพื่อให้ลิงก์
  โจทย์เปิดได้; templates เป็นตัวอย่างของผู้สอน ไม่ใช่ production schema ของโปรเจกต์.
- ไม่ใช้ผลคะแนนรอบแรกที่ไม่มีข้อมูล และไม่ได้อ้างว่า remote CI ผ่านก่อนตรวจ GitHub.
