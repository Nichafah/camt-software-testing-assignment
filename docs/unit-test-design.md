# Election App — Unit Test Design

Branch: `testing-workshop`. ใช้ Jest projects แยก unit จาก integration ใน app/jest.config.js.
ทุก path ด้านล่างสัมพันธ์กับ root repository; รันจาก app ด้วย npm run test:unit.

| ID / requirement | Unit / path | Test name (describe + it) | Given → When → Then |
|---|---|---|---|
| UT-01 Happy Path | AccountService / app/test/unit/accountService.test.ts | AccountService › register › registers a voter in an existing district | เลขบัตรถูกและ district stub คืนเขต → register → ได้ nationalId/role VOTER/district ถูกต้อง |
| UT-02 Alternative/Failure | ไฟล์เดียวกัน | AccountService › register › rejects an unknown district | district stub คืน null → register → ValidationError('unknown district') |
| UT-03 Stub | ไฟล์เดียวกัน, stubDistricts(existing) | สองชื่อข้างต้น | findById.mockResolvedValue ควบคุม indirect input; ไม่ใช้ database |
| UT-04 Spy | ไฟล์เดียวกัน | AccountService › register › stores a hash, never the plain-text password, and trims names | spy users.create → register → ตรวจ argument hash และ verifyPassword พร้อม trim firstName |
| UT-05 Mock | ไฟล์เดียวกัน | AccountService › login › issues a token for the user | issue mock คืน token-123 → login ถูกต้อง → คืน token และ issue ถูกเรียกด้วย userId/role/districtId |
| UT-06 Failure/no interaction | ไฟล์เดียวกัน | AccountService › login › rejects a wrong password without issuing a token | user ลงทะเบียนแล้ว → login password ผิด → UnauthorizedError และ issue ไม่ถูกเรียก |
| UT-07 Dynamic Faker | ไฟล์เดียวกัน | AccountService › register › registers dynamically generated Faker voter data without exposing the password hash | aValidNationalId + fakerTH ชื่อ/นามสกุล/ที่อยู่ + faker password → register → fields ตรง input, public user ไม่มี hash, saved hash ตรวจ password ถูก/ผิดได้ |
| UT-08 Fake/state | ไฟล์เดียวกัน | AccountService › register › rejects a national id that is already registered | InMemoryUserRepository จำ user แรก → register ซ้ำ → ConflictError |
| UT-09 Input partition | app/test/unit/thaiNationalId.test.ts | isValidThaiNationalId › rejects checksum digit %s for the independently known valid prefix | prefix รู้ checksum 7 → ทดลองอีก 9 digits → false ทุกตัว |
| UT-10 Time boundaries | app/test/unit/ballotRules.test.ts | whyBallotIsClosed › opensAt=%s, closedAt=%s returns %s | ไม่มี election/ก่อนเปิด 1ms/ตรงเปิด/หลังเปิด/ปิดหีบ → ตรวจเหตุผลตามตาราง 7 cases |
| UT-11 Clock + interaction | app/test/unit/pollService.test.ts | PollService › closes an existing district using the fixed clock | เขตยังไม่ปิด + fixed clock → close → ส่ง timestamp คงที่ไป repository และ response |
| UT-12 Generated builder data | app/test/unit/builders.test.ts | test data builders › aVoter › generates the same data again when faker is re-seeded | reseed faker/fakerTH → build สองครั้ง → ได้ข้อมูลเท่ากัน |

## เทคนิคและ test oracle

Stub ป้อนข้อมูล, spy เก็บสิ่งที่ส่งออก, mock ตรวจ interaction; อย่าสับสนว่า jest.fn()
ต้องเป็น mock เสมอ. Fake มี state จริงใน memory แต่ไม่พิสูจน์ SQL constraints.
Faker สร้างค่าขณะ test ทำงาน; fixed seed ทำให้ทำซ้ำได้ ไม่ใช่ hardcoded fixture.
Expected checksum ใช้ prefix ที่รู้คำตอบ ไม่คำนวณด้วย implementation ที่กำลังทดสอบ.
AAA อยู่ในแต่ละ test; fresh instances ป้องกัน state รั่วข้าม test.

Unit ไม่ทดสอบ HTTP status, SQL mapping หรือ migrations. หลักฐานระดับ component
อยู่ app/test/integration/{register,elections,poll,vote.characterization,own-project}.test.ts;
E2E อยู่ app/e2e/{voter-registration,close-poll}.spec.ts.
Coverage วัดโค้ดที่ถูกเรียก ไม่พิสูจน์ว่าทุก requirement ถูกต้อง.
