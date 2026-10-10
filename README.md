# Software Testing Assignment (15%) — Submission

**ฉบับรวมสำหรับตรวจ: [testing-workshop](https://github.com/Nichafah/camt-software-testing-assignment/tree/testing-workshop)**.
`main` เก็บ workshop reference และหน้านำทาง; โค้ดที่ส่งและ README ฉบับเต็มอยู่ branch ข้างต้น.

## Setup และรัน unit tests

ใช้ Node.js 24, npm และ Git. Unit tests ไม่ต้องใช้ Docker หรือ .env.

```sh
git clone --branch testing-workshop https://github.com/Nichafah/camt-software-testing-assignment.git
cd camt-software-testing-assignment/app
npm ci
npm run typecheck
npm run test:unit
```

คำสั่งจาก app/: `npm run test:coverage` ตรวจ unit + coverage gate;
`npm run test:integration` เปิด DB test/migrate/รัน supertest;
`npm run test:e2e` สร้าง DB E2E/app container แล้วรัน Playwright;
`npm run test:all` รวม typecheck/unit/integration/E2E. สามคำสั่งหลังต้องเปิด Docker
พร้อม Compose v2 และ ports 5433, 5434, 3000 ว่าง. รายละเอียดอยู่
[README ฉบับส่ง](https://github.com/Nichafah/camt-software-testing-assignment/blob/testing-workshop/README.md).

## หลักฐานและ testing theories

- [Audit ทุก requirement พร้อม branch/commit/path/test name](https://github.com/Nichafah/camt-software-testing-assignment/blob/testing-workshop/docs/submission-audit.md)
- [Unit test design และ six elements](https://github.com/Nichafah/camt-software-testing-assignment/blob/testing-workshop/docs/unit-test-design.md)
- [Bonus: Backend original vs V&V](https://github.com/Nichafah/camt-software-testing-assignment/blob/testing-workshop/docs/backend-comparison.md)

แยก unit ที่ไม่มี I/O จาก component ที่ใช้ PostgreSQL จริงและ E2E ผ่าน HTTP;
ใช้ AAA/Given–When–Then เพื่อแยก setup/action/assertion. Happy path คู่กับ failure
ช่วยจับข้อผิดพลาดทั้งการยอมรับและปฏิเสธ. Stub ควบคุม indirect input, spy บันทึก
indirect output, mock ตรวจ interaction; fake เป็น repository ใน memory.
Faker สร้างข้อมูลขณะรันพร้อม fixed seed; fresh fixture ป้องกัน test พึ่งลำดับ.
Dependency injection สร้าง seam; characterization บันทึกพฤติกรรมเดิมก่อน refactor;
Sprout Method แยกกฎใหม่ให้ทดสอบโดยไม่มี DB; outside-in เริ่มจาก acceptance.
CI ใช้ fail fast และ coverage gate; coverage ไม่ใช่หลักฐานว่าปราศจาก bug.

Workshop branches: step/00-setup, step/01-boundaries, step/02-aaa-unit,
step/03-test-doubles, step/04-test-data, step/05-ci, step/06-outside-in,
step/07-legacy และ testing-workshop (Lab 08).
Bonus branches: backend/original และ backend/vv; ใช้คนละ codebase กับ workshop.
ตัวเลขผลล่าสุดและข้อจำกัดเรื่องประวัติ commits/การเข้าถึง CAMTPL ดู audit report.

เอกสารของผู้สอนเดิมเก็บต่อด้านล่างเพื่อระบุที่มาของ workshop scaffold.

---

# Software Testing in Real Industry

**Hands-on automated testing workshop & readiness checklist**

Workshop 2 วัน · CMU CAMT · ส.–อา. 3–4 ตุลาคม 2026 · 09:00–16:30

ฝึกเขียน automated test แบบที่ทีมจริงใช้ บน **ระบบเลือกตั้ง** ฉบับย่อ (Express + TypeScript + PostgreSQL + Liquibase)
ตั้งแต่ unit test ไปจนถึง CI, outside-in และการเอา legacy code เข้า test — แล้วนำไปใช้กับโปรเจกต์ของตัวเอง

## เริ่มที่นี่

1. **ก่อนมา workshop** — ทำตาม [setup/README.md](setup/README.md) จน `npm run doctor` ขึ้น ✅ READY
   แล้วส่ง screenshot + test cases ภายใน **พฤ. 1 ต.ค. 2026**
2. **ระหว่าง workshop** — รายการ lab และวิธีสลับ branch อยู่ที่ [labs/README.md](labs/README.md)
3. **ประเมินโปรเจกต์ตัวเอง** — [checklist/README.md](checklist/README.md) (รอบ 1 เช้า Day 1 · รอบ 2 ท้าย Day 2)

## Branches

```text
main                      ระบบอ้างอิง + test infra + CI (+ slides, facilitator guide)
jest/lab/NN-name          จุดเริ่มต้นของ lab NN — โจทย์อยู่ที่ labs/NN-name/README.md
jest/solution/NN-name     เฉลย lab NN = จุดเริ่มต้นของ lab NN+1
demo/testcontainers       demo: integration test บน Testcontainers
demo/playwright-browser   demo: Playwright ผ่าน browser
```

ตามไม่ทันไม่เป็นไร — ทุก lab เริ่มจากเฉลยของ lab ก่อนหน้า:

```bash
git stash -u                         # เก็บงานตัวเอง (-u = รวมไฟล์ใหม่ด้วย)
git switch jest/lab/06-outside-in    # ไป lab ถัดไปได้ทันที
```

## โครงสร้าง repo

| | |
|---|---|
| [`app/`](app/) | ระบบเลือกตั้ง + test ทั้งหมด (`test/unit`, `test/integration`, `e2e/`) และ Liquibase changelog (`db/`) — รายละเอียดใน [app/README.md](app/README.md) |
| [`labs/`](labs/) | โจทย์ของแต่ละ lab |
| [`checklist/`](checklist/) | Readiness Checklist สำหรับโปรเจกต์ของตัวเอง |
| [`setup/`](setup/) | สิ่งที่ต้องทำก่อนมา workshop |
| `.github/workflows/ci.yml` · `.gitlab-ci.yml` · `Jenkinsfile` | pipeline เดียวกันบน 3 CI |
| `slides/` · `facilitator/` | สไลด์ (Marp) และคู่มือผู้สอน — อยู่บน `main` เท่านั้น |

## คำสั่งที่ใช้บ่อย

รันในโฟลเดอร์ `app/` (ต้องเปิด Docker ไว้ ยกเว้น `test:unit`)

```bash
npm run doctor            # ตรวจความพร้อมของเครื่อง
npm run test:unit         # unit test — ไม่มี I/O
npm run test:integration  # เปิด test DB (port 5433) + migrate แล้วรัน component test
npm run test:e2e          # build app container แล้วรัน Playwright API test
npm run db:reset:test     # สร้าง test DB ใหม่ทั้งก้อน
```

## Workshop นี้อิงจาก

- Toby Clemson — [*Testing Strategies in a Microservice Architecture*](https://martinfowler.com/articles/microservice-testing/) (martinfowler.com)
- Gerard Meszaros — [*xUnit Test Patterns: Refactoring Test Code*](http://xunitpatterns.com/)
- Steve Freeman & Nat Pryce — [*Growing Object-Oriented Software, Guided by Tests*](https://growing-object-oriented-software.com/)
- Michael Feathers — [*Working Effectively with Legacy Code*](https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055)
