# Lab 05 — Continuous Integration

**เวลา:** ~40 นาที

## แนวคิด: CI เป็นแค่ "คนกดปุ่ม" — logic อยู่ใน repo

repo นี้มี pipeline 3 แบบที่ทำงานเหมือนกัน:

| CI | ไฟล์ | Docker มาจากไหน |
|---|---|---|
| GitHub Actions | `.github/workflows/ci.yml` | Docker บน runner (ubuntu-latest) |
| GitLab CI | `.gitlab-ci.yml` | `docker:dind` service (runner ต้อง `privileged = true`) |
| Jenkins | `Jenkinsfile` | Docker ของ agent เครื่องนั้น |

ทั้ง 3 เรียก **`npm run ...` ชุดเดียวกับที่เรารันในเครื่อง** → ถ้าผ่านในเครื่อง ก็ผ่านใน CI (และกลับกัน)

## Part A — อ่าน pipeline (10 นาที)

เปิดไฟล์ CI ที่ทีมของคุณจะได้ใช้จริงในงาน แล้วตอบ:
1. ลำดับ stage คืออะไร? ทำไม unit ถึงมาก่อน e2e? (คิดเรื่อง *fail fast* และค่าใช้จ่าย)
2. Liquibase ถูกรันตรงไหน? database ใน CI มาจากไหนและถูกลบเมื่อไหร่?
3. GitLab: ทำไม `DATABASE_URL` ชี้ไปที่ host `docker` ไม่ใช่ `localhost`?
4. Jenkins: ทำไมต้องมี `docker compose down -v` ใน `post { always }` แต่ GitHub/GitLab ไม่ต้อง?

## Part B — เห็น CI แดงและเขียว (10 นาที)

1. สร้าง repo ใหม่บน GitHub (private ได้) แล้ว push:
   ```bash
   git remote add mine git@github.com:<you>/election-testing.git
   git push mine HEAD:main
   ```
2. ดู tab **Actions** — ใช้เวลาแต่ละ job เท่าไหร่?
3. ทำให้ unit test แดง 1 ตัว → push → job ไหนรัน job ไหนไม่รัน?
4. แก้คืน → push → เขียว

## Part C — เพิ่ม quality gate (20 นาที)

เพิ่ม 2 อย่างนี้ใน pipeline (เลือก CI ที่ถนัด — เฉลยมีครบทั้ง 3 แบบ):

**C1 — Coverage gate สำหรับ unit tests**
- เพิ่ม script `test:coverage` ที่รัน unit test พร้อม `--coverage`
- ตั้ง `coverageThreshold` ใน `jest.config.js` **เฉพาะโฟลเดอร์ที่ unit test ควรครอบคลุม** (`src/domain/`, `src/services/`)
- ทำไมไม่ตั้ง threshold ทั้ง project? (ลองรันแล้วดูตัวเลขของ `src/routes/` และ `src/repositories/`)
- CI เก็บ `coverage/` เป็น artifact

**C2 — ทดสอบ rollback ของ migration**
- Liquibase มีคำสั่ง `update-testing-rollback`: update → rollback ทั้งหมด → update อีกรอบ
- เพิ่ม script `db:test-rollback` แล้วรันใน job integration ก่อน `test:integration`
- ลองเขียน changeset ที่ `--rollback` ผิด (เช่น drop table ผิดชื่อ) แล้วดูว่า CI จับได้ไหม

## คุยกัน

- coverage 100% แปลว่าไม่มี bug หรือเปล่า? (ลองดู test ที่ไม่มี assertion ใน Lab 02)
- ถ้า e2e ใช้เวลา 15 นาที ควรรันทุก push หรือไม่? มีทางเลือกอะไรบ้าง (รันเฉพาะ main, nightly, แบ่ง shard)?
