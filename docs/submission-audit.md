# Submission Readiness Audit — Software Testing Assignment (15%)

ตรวจวันที่ 2026-10-10 (Asia/Bangkok), repository Nichafah/camt-software-testing-assignment.
ฉบับรวม: testing-workshop. PASS = มีหลักฐานตรงข้อกำหนด; PARTIAL = มีบางส่วนหรือ
ยังตรวจยืนยันไม่ได้; MISSING = ยังไม่มี. รายงานแยก mandatory และ bonus ไม่ตีความว่า
คะแนน readiness 24/24 หมายถึงข้อกำหนดส่งงานทุกข้อผ่าน.

## Mandatory requirements

| Requirement | Status | Exact evidence / ข้อจำกัด |
|---|---|---|
| 1. Re-implement workshop และ branch/step commits/theory | **PARTIAL** | มี Lab 00–08 ทุก branch และเอกสารตามตารางด้านล่าง; Labs 00–06 มีหลาย progress commits; Lab 07 commit 2285794 และ Lab 08 commit 0f1cf43 รวม implementation หลักต่อ Lab ไม่ได้แยกทุก part เป็น commits. ไม่เขียน history ย้อนหลังให้ดูเหมือนทำทีละขั้น. ภาพใน Mango URL ที่ให้เปิดผ่านเครื่องมือไม่ได้ จึงตรวจรายละเอียดเพิ่มเติมในภาพไม่ได้ |
| 2.1 Design + execute Election App unit tests | **PASS** | docs/unit-test-design.md ให้ Given→When→Then, oracle, paths และ test names; app/test/unit 11 suites / 71 tests ผ่านจริง |
| 2.3.1 Happy Path | **PASS** | app/test/unit/accountService.test.ts: AccountService › register › registers a voter in an existing district |
| 2.3.2 Alternative / Failure | **PASS** | ไฟล์เดียวกัน: AccountService › register › rejects an unknown district; AccountService › login › rejects a wrong password without issuing a token |
| 2.3.3 Stub | **PASS** | ไฟล์เดียวกัน: stubDistricts(true/false), findById.mockResolvedValue; tests registers a voter in an existing district / rejects an unknown district |
| 2.3.4 Spy | **PASS** | ไฟล์เดียวกัน: jest.spyOn(users,'create'); stores a hash, never the plain-text password, and trims names ตรวจ create.mock.calls |
| 2.3.5 Mock | **PASS** | ไฟล์เดียวกัน: issues a token for the user ตั้ง tokens.issue คืน token-123 และ toHaveBeenCalledWith principal |
| 2.3.6 Dynamic Faker | **PASS** | ไฟล์เดียวกัน: registers dynamically generated Faker voter data without exposing the password hash; fakerTH ชื่อ/นามสกุล/ที่อยู่, faker password, aValidNationalId; test/support/seedFaker.ts กำหนด seed. ไม่ใช่แค่ทดสอบ builder |
| 5. Comprehensive root README | **PASS** | README.md บน testing-workshop: clone/npm ci/typecheck/unit/coverage/integration/E2E, theories, branch map; main:README.md มี submission landing + คำสั่ง setup และทฤษฎีชี้ฉบับรวม |
| 6. Push ทุก local branch / commits | **PASS หลังตรวจ remote** | ตรวจ git ls-remote --heads origin เทียบ git for-each-ref refs/heads ทุก branch แบบ SHA equality; รวม backup/lab03-extra-commit ที่พบว่ายังไม่ push ในการตรวจครั้งแรก. ผลสุดท้ายต้องยืนยันหลัง push; ดู command ด้านล่างและ final response |
| 7. CAMTPL access | **PARTIAL** | GitHub API ยืนยัน repository public, CAMTPL permission=read; แต่ GET collaborators/CAMTPL = 404 และ invitations ไม่มี CAMTPL/email ที่ระบุ. อ่าน public repo ได้ แต่ยังไม่มีหลักฐาน configured collaborator/invitation; ไม่ได้ส่ง invitation ในงานนี้ |
| Academic integrity / provenance | **PARTIAL (ต้องยืนยันโดยผู้ส่ง)** | workshop scaffold ระบุที่มา boyone; source bonus ระบุ URL ที่ผู้ส่งให้; ไม่มีการคัดลอก solution ใน audit นี้. Existing ancestry มี upstream commits ชื่อ Solution จากฐานเดิม จึงไม่รับรองว่าไฟล์ทั้งหมดเป็นผลงานเขียนใหม่เอง. README ระบุ AI assistance; ผู้ส่งต้องยืนยัน attribution/นโยบายวิชาและเข้าใจงาน |

## Workshop history / explanations

ไฟล์เอกสาร Lab 00–03 ถูกนำจาก branch ของผู้เรียนมารวมใน testing-workshop เพื่อให้
ผู้ตรวจอ่านครบ โดยไม่เปลี่ยน source/ประวัติ branch เดิม. Counts ในบันทึกเดิมเป็นผลในอดีต.

| Lab / branch | Progress commits ที่ตรวจพบ | Paths / concepts |
|---|---|---|
| 00 step/00-setup | bf3f94d red, 458ed5b green, a4189cf lockfile, f062e77 reflection | docs/step-00-setup.md; app/src/domain/thaiNationalId.ts; boundaries, red–green, environment |
| 01 step/01-boundaries | e446cba classification, b8ac1a4 own cases/reflection | docs/step-01-boundaries.md; labs/01-boundaries/worksheet.md ใน branch นั้น; Given/When/Then, boundary selection |
| 02 step/02-aaa-unit | 101f605 mutation, 0b166de restore, cf5927f refactor, ea3dbb0 evidence | docs/step-02-aaa-unit.md; app/test/unit/{thaiNationalId,passwords,config}.test.ts; AAA, smells, mutation |
| 03 step/03-test-doubles | 64a0ae1 fakes, 397641d timers, 3d53b1e account doubles, cf75205 theory | docs/step-03-test-doubles.md; app/test/unit/accountService.test.ts, jwtTokenService.test.ts; five doubles |
| 04 step/04-test-data | 3e4b8ca builders, 46f8734 fixtures, 657b28f migrations, 11cbf1b reflection | docs/lab04-test-data.md; app/test/support/builders.ts, seedFaker.ts; Faker/isolation |
| 05 step/05-ci | a2e60cb red, 6ba007f restore, 435f963 gate, aff772d rollback, 235d174 reflection | docs/lab05-ci.md; .github/workflows/ci.yml; fail fast, coverage, migration rollback |
| 06 step/06-outside-in | 3f54ca5 implementation/tests, 908fe67 E2E isolation, 1b5e7f2 refactor/reflection | docs/lab06-outside-in.md; app/e2e/close-poll.spec.ts; acceptance→component→unit |
| 07 step/07-legacy | 2285794 implementation + reflection | labs/07-legacy/README.md; app/test/integration/vote.characterization.test.ts; src/routes/voteRoutes.ts, src/domain/ballotRules.ts (ใต้ app); characterization/DI/sprout; 13 baseline cases ก่อน Part B และ 16 final cases |
| 08 testing-workshop | 0f1cf43 implementation + readiness; audit follow-up commits แสดงใน git log | labs/08-own-project/README.md; app/test/integration/own-project.test.ts; checksum cases; checklist/README.md; test:all |

Branch snapshots ไม่เป็นเส้น cumulative เดียวทั้งหมด; ไม่ merge/rewrite branches เพื่อ
ซ่อนฐานเดิม. Lab 07/08 run evidence มีใน README แต่ Git ยังไม่ใช่ commit แยกทุก part.
ถ้าอาจารย์ต้องการ granularity ระดับ A/B/C ให้ชี้แจงตามจริง; การแยก commit ย้อนหลัง
ไม่ได้พิสูจน์ว่ามี commits ในขณะทำงาน. Screenshot workshop อยู่หลัง Mango access ที่
เครื่องมือเปิดไม่ได้: https://mango-cmu.instructure.com/courses/30275/files/6353384/preview.

## Bonus requirement 2.2

**PASS — technical branches + documented comparison**, scope อยู่ voting operation.

- backend/original: 32d103e27ebb0526bbf0968d1e1987e21cb561a8, source ที่ผู้ส่งระบุ;
  tree hash 091fdca57c8fc1bfa8b6e398de045d86671e9948 ตรงกับ source clone.
- backend/vv: characterization commit 2ba02ad, refactor e226470, typecheck documentation 37ddfa2.
- docs/backend-comparison.md และ backend/vv:README.md แสดง same/changed/rationale,
  commands และข้อจำกัด. Backend เดิมมี closed-poll rule อยู่แล้ว; bonus ไม่อ้างว่าเพิ่งเพิ่ม.
- backend/vv:test/unit/vote.test.cjs ผ่าน 7 tests ทั้งก่อนและหลัง refactor;
  src/services/castVote.ts เพิ่ม injectable narrow interfaces;
  src/services/vote.service.ts เรียก function โดย default เป็น real repositories.
- ต้องให้เจ้าของยืนยันอีกครั้งถ้าโค้ดที่ส่งวิชา Backend ใช้ commit อื่นจาก main snapshot ที่ให้.

## Executed verification

ตรวจในเครื่องจริงหลังเพิ่ม Faker service test:

| Command / scope | Result |
|---|---|
| npm run test:all (ใน app) | Exit 0: typecheck ผ่าน; unit 11 suites / 71 tests; integration 5 suites / 30 tests; E2E 2 tests |
| npm run test:coverage (ใน app) | Exit 0: 71 tests; statements 88.34%, branches 84.05%, functions 100%, lines 91.95%; ผ่าน thresholds เดิม |
| npm test (ใน backend/vv worktree) | 7 passed / 0 failed; Node built-in runner |
| Targeted strict tsc ของ backend/vv:src/services/castVote.ts | ผ่าน; ใช้ workshop compiler พร้อม --ignoreConfig |
| Database checks | Lab 07 รัน db:reset:test → db:test-rollback → test:integration สำเร็จ; audit test:all migrate test/e2e สำเร็จ |

Tests ไม่ได้พิสูจน์ concurrent close/vote, full original Backend build หรือ Prisma/HTTP/
S3/Supabase integration. ผล local ไม่ใช่การรับรอง GitHub Actions run ล่าสุด.

## Repository access evidence (read-only GitHub API)

ตรวจด้วย credentials ของ repository owner โดยไม่พิมพ์ token หรือเก็บ credentials:

- GET /repos/Nichafah/camt-software-testing-assignment: private=false, default_branch=main.
- GET /repos/.../collaborators/CAMTPL: HTTP 404 (ยังไม่ใช่ configured collaborator).
- GET /repos/.../collaborators/CAMTPL/permission: permission=read, role_name=read;
  public read อย่างเดียวไม่พิสูจน์การเชิญ.
- GET /repos/.../invitations?per_page=100: ไม่มีรายการตรง CAMTPL หรือ pattama.cmu@gmail.com.
- ไม่ส่ง invitation และไม่อ้างว่าเคยส่ง/ได้รับการตอบรับ.

**Manual action:** Settings → Collaborators → Add people → CAMTPL (หรือ email ที่ผู้สอนระบุ),
ตรวจ username ให้ตรงและเก็บสถานะ invitation/accepted; ผู้รับต้อง accept จึงยืนยัน configured access ได้.

## Recheck remote / submission

```sh
git fetch origin
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads
git ls-remote --heads origin
git log --oneline testing-workshop
git diff backend/original..backend/vv -- src/services package.json test README.md
```

เทียบ hash ทุก local branch กับ origin โดยไม่รวม upstream instructor refs ซึ่งไม่ใช่งานส่ง.
ส่งลิงก์ branch testing-workshop พร้อม bonus branches; main มี landing ชี้ฉบับรวม.
Manual actions ที่ยังต้องทำ: configured CAMTPL access, ยืนยัน exact Backend submission
snapshot/attribution, และตรวจภาพ/เงื่อนไข granularity ของ workshop ที่เครื่องมือเปิดไม่ได้.
