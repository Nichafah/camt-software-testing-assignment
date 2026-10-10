# Software Testing Assignment (15%) — Election App

งาน V&V สำหรับ workshop 3–4 ตุลาคม 2026. **Branch ส่งงานฉบับรวม: `testing-workshop`**.
รายงานตรวจข้อกำหนดและข้อจำกัด: [Submission audit](docs/submission-audit.md).
ตารางออกแบบ unit tests: [Unit test design](docs/unit-test-design.md).
Bonus เปรียบเทียบ Backend จริง: [Backend comparison](docs/backend-comparison.md).

## Setup และรันจาก clone ใหม่

ต้องมี Git, Node.js 24 และ npm. Unit tests ไม่ต้องมี Docker, PostgreSQL หรือ .env.
Integration/E2E ต้องเปิด Docker Engine/Desktop พร้อม Compose v2; ใช้ ports 5433,
5434 และ 3000. ชุดทดสอบตั้งค่าฐานข้อมูลอัตโนมัติ ไม่ต้อง import dump หรือ seed ด้วยมือ.

```sh
git clone --branch testing-workshop https://github.com/Nichafah/camt-software-testing-assignment.git
cd camt-software-testing-assignment/app
npm ci
npm run typecheck
npm run test:unit
```

คำสั่งทั้งหมดด้านล่างรันจาก `app/`:

| คำสั่ง | หน้าที่ / สิ่งที่ต้องมี |
|---|---|
| `npm run test:unit` | Jest units ไม่มี external I/O; ไม่ต้อง Docker |
| `npm run test:coverage` | Unit + coverage report และ quality gate |
| `npx jest --selectProjects unit --runInBand --testPathPatterns=accountService` | รันเฉพาะ AccountService รวมตัวอย่าง six elements |
| `npm run test:integration` | เริ่ม db-test port 5433, Liquibase migrate, supertest + PostgreSQL จริง |
| `npm run test:e2e` | สร้าง db-e2e ใหม่ port 5434, migrate, build app port 3000, Playwright API tests |
| `npm test` | Unit + integration |
| `npm run test:all` | Typecheck + unit + integration + E2E |
| `npm run db:test-rollback` | Liquibase update/testing rollback บน db-test; ไม่มี changeset ค้างอาจ rollback 0 ตัว |
| `npm run db:reset:test` | สร้างเฉพาะฐานข้อมูล test ใหม่; ข้อมูล test เดิมหาย |
| `npm run doctor` | ตรวจ tools, migrations และตัวอย่าง tests |
| `npm run db:down` | หยุด containers ของโปรเจกต์; dev volume ยังคงอยู่ |

เพื่อพิสูจน์ migration จากฐานข้อมูลเปล่า: `npm run db:reset:test`,
`npm run db:test-rollback`, แล้ว `npm run test:integration` ตามลำดับ.
อย่ารันหลาย integration suites พร้อมกันบน db-test เดียว เพราะแต่ละ suite truncate ข้อมูล.
หากมี process อื่นใช้ port 3000 ให้หยุด process ของตัวเองก่อน E2E.
Faker seed อยู่ `app/test/support/seedFaker.ts`; test DB environment อยู่
`app/test/integration/env.ts`. Development defaults ดู `app/src/config.ts`;
รัน dev ด้วย `npm run db:up`, `npm run db:migrate`, `npm run dev`.
รายละเอียด API และ database: [app README](app/README.md).

## Testing concepts และหลักฐาน

**Verification** ตรวจ implementation ตามกฎที่ระบุ เช่น checksum และห้าม vote หลังปิดหีบ;
**Validation** ตรวจ scenario ที่ผู้ใช้ต้องทำได้ เช่น voter ลงคะแนนแล้ว commissioner
ปิดหีบและประกาศผล. Automated tests เป็นหลักฐานบางส่วนของความถูกต้อง ไม่แทนการยืนยัน
requirement จากผู้ใช้ และ coverage สูงไม่ได้แปลว่าไม่มี bug.

แยก **unit** (`app/test/unit`) ที่ไม่มี I/O, **component/integration**
(`app/test/integration`) ที่ใช้ app ใน process กับ DB จริง, และ **E2E** (`app/e2e`)
ที่ตรวจ HTTP กับ app container. Unit ชี้สาเหตุได้เร็ว; ระดับบนตรวจรอยต่อจริงแต่แพงกว่า.
**AAA / Given–When–Then** ทำให้แยกการเตรียมข้อมูล, การเรียก unit และผลที่คาดหวัง.
**Equivalence partitioning/boundary values** ตรวจเลขบัตรที่ถูก/ผิดและเวลาเปิดก่อน 1ms,
ตรงเวลาเปิด, หลังเปิด. **Red–green และ mutation experiment** เคยใส่บั๊กที่ checksum/
password ใน branch Lab 00/02 เพื่อดูว่า tests จับได้ แล้วคืนโค้ดให้ผ่าน.

**Stub** ป้อน input ทางอ้อม (`stubDistricts`); **Spy** บันทึก output ทางอ้อม
(`jest.spyOn(users, 'create')`); **Mock** ตั้ง expectation การเรียก collaborator
(`tokens.issue`). `jest.fn()` เป็นกลไกเดียวกัน แต่บทบาทขึ้นกับวิธีใช้.
**Fake** เป็น implementation แบบย่อที่มี state (`InMemoryUserRepository`);
**Dummy** ส่งให้ครบ dependency แต่ไม่ควรถูกใช้. Mock ที่ repository/token interfaces
ซึ่งเราเป็นเจ้าของ และตรวจ SQL จริงด้วย component tests แทน mock PostgreSQL.

**Faker** สร้างข้อมูลขณะรัน พร้อม fixed seed เพื่อทำซ้ำได้ ไม่ใช่การคัดค่าที่สุ่มครั้งเดียว
มา hardcode. Test `registers dynamically generated Faker voter data without exposing the password hash`
ทดสอบ AccountService กับชื่อ/ที่อยู่/รหัสผ่านที่สร้างจริง และตรวจการเก็บ hash.
**Fresh fixture** truncate/reset poll ใน beforeEach ป้องกัน test พึ่งลำดับกัน.
**Dependency injection / seam** ควบคุม pool, token และ Clock โดยไม่แก้ global env.
**Characterization** บันทึกพฤติกรรม legacy ก่อน refactor แม้ input "abc" จะตอบ 500;
**Sprout Method** แยก `whyBallotIsClosed` ให้ทดสอบกฎโดยไม่มี HTTP/DB.
**Outside-in** เริ่ม acceptance scenario แล้วแยก component/unit;
**CI fail fast** รัน typecheck/unit ก่อน integration/E2E และตรวจ rollback migrations.

## Workshop branches และเอกสารของผู้เรียน

| Lab | Branch | แนวคิด / เอกสาร |
|---|---|---|
| 00 | `step/00-setup` | [Boundaries, red–green, environment](docs/step-00-setup.md) |
| 01 | `step/01-boundaries` | [จัด boundary และ Given–When–Then](docs/step-01-boundaries.md) |
| 02 | `step/02-aaa-unit` | [AAA, test smells, mutation](docs/step-02-aaa-unit.md) |
| 03 | `step/03-test-doubles` | [Dummy, stub, spy, mock, fake, timers](docs/step-03-test-doubles.md) |
| 04 | `step/04-test-data` | [Builders, Faker, migrations, isolation](docs/lab04-test-data.md) |
| 05 | `step/05-ci` | [CI, coverage, rollback](docs/lab05-ci.md) |
| 06 | `step/06-outside-in` | [Outside-in acceptance → unit](docs/lab06-outside-in.md) |
| 07 | `step/07-legacy` | [Characterization, seam, sprout](labs/07-legacy/README.md) |
| 08 | `testing-workshop` | [นำไปใช้กับโปรเจกต์และ readiness](labs/08-own-project/README.md) |

ดู commits ของแต่ละ branch ด้วย `git log --oneline <branch>` และดูไฟล์ใน snapshot
โดยไม่เปลี่ยนงานด้วย `git show <branch>:<path>`. Branches เก่าเป็นหลักฐานตามช่วงเวลา;
บาง Lab เริ่มจาก starter คนละฐาน จึงไม่ใช่ทุก branch ที่เป็น ancestor ของฉบับรวม.
Lab 07/08 มี implementation commit หลักหนึ่งตัวต่อ Lab; ไม่ได้สร้างประวัติย้อนหลัง
ให้ดูเหมือน commit แยกทุกขั้น. เอกสาร Lab 00–03 ที่รวบรวมเป็นบันทึกเดิมของผู้เรียน
ตัวเลข test ในบันทึกเก่าเป็นผล ณ เวลานั้น ให้ใช้ audit สำหรับผลตรวจล่าสุด.

## Bonus และขอบเขตของหลักฐาน

`backend/original` คือ snapshot Backend ที่เจ้าของงานระบุจาก repository
[thanapon1406/953713-software-backend-development-final-project](https://github.com/thanapon1406/953713-software-backend-development-final-project),
commit `32d103e`. `backend/vv` เพิ่ม characterization แล้ว extract injectable vote operation
พร้อม tests 7 ตัว. อ่าน [comparison](docs/backend-comparison.md) ก่อนสลับ branch เพราะเป็น
codebase Prisma อีกตัวและใช้คำสั่งต่างจาก workshop. ไม่มีการส่ง changes กลับต้นทาง.

Workshop scaffold/โจทย์มาจาก [boyone/camt-software-testing](https://github.com/boyone/camt-software-testing).
ประวัติเดิมมี upstream commits ชื่อ Solution จากฐานของ Labs; การ audit ครั้งนี้ไม่คัดลอก
solution branch และไม่แก้ประวัติเพื่อซ่อนที่มา. งานนี้มี AI assistant ช่วย coding/testing/
documentation; ผู้ส่งควรตรวจให้เข้าใจและระบุการใช้เครื่องมือตามนโยบายรายวิชา.
Root README นี้อธิบายงานส่งของผู้เรียน; เอกสารตั้งต้นของ workshop เก็บต่อด้านล่าง.

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
- Gerard Meszaros — *xUnit Test Patterns: Refactoring Test Code*
- Steve Freeman & Nat Pryce — *Growing Object-Oriented Software, Guided by Tests*
- Michael Feathers — *Working Effectively with Legacy Code*
