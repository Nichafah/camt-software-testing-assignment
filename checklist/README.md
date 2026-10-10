# Readiness Checklist — Software Testing in Real Industry

ประเมินโปรเจกต์ระบบเลือกตั้ง **ของตัวเอง** 2 รอบ: Day 1 เช้า (ก่อนเริ่ม) และ Day 2 ท้ายวัน (หลังจบ)

คะแนน: **0** = ยังไม่มี · **1** = มีบางส่วน / ทำด้วยมือ · **2** = มีครบ และทำงานอัตโนมัติ

| # | หมวด | ข้อ | ตัวอย่างหลักฐาน ("2 คะแนน" หน้าตาเป็นอย่างไร) | รอบ 1 | รอบ 2 |
|---|---|---|---|---|---|
| 1 | Structure | ระบุ test boundary ของระบบชัดเจน | มีเอกสาร/README บอกว่า unit, component, e2e ทดสอบอะไร และอยู่ที่ไหน | ไม่บันทึก | 2 |
| 2 | Structure | แยก test ที่ไม่มี I/O ออกจาก test ที่ต้องใช้ database | `npm run test:unit` รันได้โดยไม่ต้องเปิด Docker | ไม่บันทึก | 2 |
| 3 | Structure | รัน test ทั้งหมดได้ด้วยคำสั่งเดียว | `npm test` จาก clone ใหม่ ไม่ต้องทำขั้นตอนมือ | ไม่บันทึก | 2 |
| 4 | Environment | database สำหรับ test สร้างจาก migration ที่ versioned | changelog/migration อยู่ใน git, test DB สร้างใหม่ได้ทุกครั้ง | ไม่บันทึก | 2 |
| 5 | Environment | ไม่มีขั้นตอน database ที่ต้องทำด้วยมือ | ไม่มี "import dump.sql ก่อนนะ" หรือ "สร้าง table นี้เอง" | ไม่บันทึก | 2 |
| 6 | Environment | test รันได้เหมือนกันทั้งในเครื่องและใน CI | CI เรียก script เดียวกับที่รันในเครื่อง และรันทุก push | ไม่บันทึก | 2 |
| 7 | Data | ข้อมูลใน test สร้างด้วย builder / factory ไม่ใช่ fixture ก้อนเดียวที่ทุก test ใช้ร่วมกัน | `aVoter().inDistrict('CM-1').build()` | ไม่บันทึก | 2 |
| 8 | Data | test แต่ละตัวไม่ขึ้นกับกันและกัน | รันตัวเดียว, สลับลำดับ, หรือรันซ้ำ ก็ได้ผลเหมือนเดิม | ไม่บันทึก | 2 |
| 9 | Data | ควบคุมเวลาและค่าสุ่มได้ | inject `Clock`, fake timers, `faker.seed()` | ไม่บันทึก | 2 |
| 10 | Design | dependency สำคัญ inject ได้ (มี seam) | DB, เวลา, token service ส่งเข้ามาผ่าน constructor/factory | ไม่บันทึก | 2 |
| 11 | Design | ใช้ test double ถูกระดับ | mock/stub เฉพาะ boundary ที่เราเป็นเจ้าของ interface, ไม่ mock ทุกอย่าง | ไม่บันทึก | 2 |
| 12 | Design | ส่วน legacy ที่เสี่ยงที่สุดมี characterization test | ก่อนแก้โค้ดเก่า มี test จับพฤติกรรมปัจจุบันไว้ | ไม่บันทึก | 2 |
| | | | **รวม (เต็ม 24)** | ไม่ทราบ | **24** |

## หลังให้คะแนน

- ข้อไหนได้ 0 ที่ **แก้ได้ภายใน 1 วัน**? → เขียนเป็นงานถัดไปของตัวเอง
- ข้อไหนที่ทีมใน industry มักข้าม แล้วค่อยมาจ่ายทีหลัง? (คุยกันตอนปิด Day 2)

## หลักฐานรอบสอง (Lab 08)

| ข้อ | หลักฐาน |
|---|---|
| 1 | app/README.md ตาราง test boundaries และ app/jest.config.js |
| 2 | npm run test:unit ไม่มี I/O; DB อยู่ integration project |
| 3 | npm run test:all รวม typecheck + unit + integration + E2E; npm test เดิมรวม unit/integration |
| 4–5 | app/db/changelog, Dockerfile, compose; migration และ update-testing-rollback บน db-test เปล่า |
| 6 | .github/workflows/ci.yml เรียก scripts เดียวกับเครื่องและ trigger push/PR; ตรวจไฟล์และ local scripts แล้ว ไม่อ้างว่า remote CI ล่าสุดผ่าน |
| 7 | test/support/builders.ts และ integration/support/given.ts; tests ใหม่ใช้ builders |
| 8 | beforeEach truncateAll + reset closed_at; characterization รันเดี่ยวและรัน suite ผ่าน |
| 9 | test/support/seedFaker.ts + injected fixed Clock ใน characterization/own-project |
| 10 | AppDeps และ voteRoutes({pool,tokens,clock}); secret/เวลาเปลี่ยนจาก test ได้ |
| 11 | service unit tests ใช้ repository interfaces/test doubles; component ใช้ PostgreSQL จริง |
| 12 | vote.characterization.test.ts ผ่านก่อนเปลี่ยน production และหลัง break dependencies ทีละขั้น |

คะแนน 24 เป็นการประเมินความพร้อมของความสามารถที่มี ไม่ใช่คำรับรองว่าครอบคลุมทุกกรณี.
รอบแรกเดิมว่าง จึงไม่มีหลักฐานให้คำนวณคะแนนเพิ่มขึ้น ห้ามตีความว่าเริ่มจาก 0.
งานต่อในหนึ่งวัน: แยก VoteRepository/PollService พร้อม tests ก่อนย้าย SQL;
ติดตาม transaction/locking สำหรับ concurrent closure และกำหนด input validation ใหม่.
สิ่งที่ทีมมักข้ามคือ isolation, migration rollback และ characterization ก่อน refactor;
ผลเสียคือ test flaky, deploy ย้อนกลับไม่ได้ หรือเปลี่ยนพฤติกรรมเก่าโดยไม่ตั้งใจ.
