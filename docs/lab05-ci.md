# Lab 05 — Continuous Integration

## Part A: อ่าน Pipeline

### 1. ลำดับ Stage และเหตุผลที่ Unit มาก่อน E2E

GitHub Actions CI Pipeline มีลำดับการทำงาน 3 Jobs ได้แก่

1. **Unit:** ติดตั้ง Dependencies ตรวจสอบ TypeScript ด้วย `typecheck` และรัน Unit Tests
2. **Integration:** ทำงานหลัง Unit ผ่าน โดยเริ่มฐานข้อมูลทดสอบ รัน Liquibase และ Integration Tests
3. **E2E:** ทำงานหลัง Integration ผ่าน โดยเตรียมฐานข้อมูลและ Application Container ก่อนรัน Playwright Tests

ในไฟล์ `.github/workflows/ci.yml` มีการกำหนด `needs: unit` และ `needs: integration` เพื่อควบคุมลำดับการทำงาน

เหตุผลที่ Unit Test มาก่อน E2E Test คือหลักการ **Fail Fast** เนื่องจาก Unit Test ทำงานรวดเร็วและใช้ทรัพยากรน้อยกว่า หาก Unit Test ไม่ผ่าน Pipeline จะไม่เข้าสู่ Integration และ E2E ซึ่งใช้เวลาและทรัพยากรมากกว่า ช่วยลดเวลาและค่าใช้จ่ายในการทดสอบ

### 2. Liquibase ถูกรันตรงไหน และฐานข้อมูลใน CI มาจากไหนและถูกลบเมื่อไหร่

Liquibase ถูกรันในขั้นตอน Integration Test และ E2E Test ผ่าน npm scripts ที่กำหนดใน `app/package.json`

**Integration Test**

- `db:up:test` เริ่ม PostgreSQL Service ชื่อ `db-test` ผ่าน Docker Compose
- `db:migrate:test` รัน Liquibase เพื่อเตรียมโครงสร้างฐานข้อมูล
- `test:integration` เรียกใช้ขั้นตอนดังกล่าว ก่อนรัน Jest Integration Tests

**E2E Test**

- `db:up:e2e` เริ่ม PostgreSQL Service ชื่อ `db-e2e`
- `db:migrate:e2e` รัน Liquibase สำหรับฐานข้อมูล E2E
- `test:e2e` เริ่มฐานข้อมูล ทำ Migration เริ่ม Application Container และรัน Playwright Tests

ฐานข้อมูลทั้งสองชุดสร้างผ่าน Docker Compose เพื่อใช้สำหรับการทดสอบโดยเฉพาะ และแยกจากฐานข้อมูล Production

**การลบฐานข้อมูลหลังการทดสอบ**

- **GitHub Actions:** แต่ละ Job ทำงานบน Runner ที่แยกจากกัน เมื่อ Job สิ้นสุด Runner และทรัพยากร Docker ภายในจะถูกยกเลิก
- **GitLab CI:** ใช้ Docker-in-Docker สำหรับ Jobs ที่ต้องใช้ฐานข้อมูล โดยการทำความสะอาดสภาพแวดล้อมขึ้นอยู่กับการจัดการ Job และ Runner
- **Jenkins:** ใช้คำสั่ง `docker compose --profile e2e --profile tools down -v --remove-orphans` ใน `post { always }` เพื่อทำความสะอาด Containers และ Volumes หลังจบ Pipeline

### 3. ทำไม GitLab ใช้ Host `docker` ไม่ใช่ `localhost`

GitLab CI ใช้ Docker-in-Docker (DinD) โดยกำหนด Service Alias เป็น `docker` และเชื่อมต่อ Docker Daemon ผ่าน `tcp://docker:2375`

ดังนั้น PostgreSQL ที่สร้างผ่าน Docker Compose จะเข้าถึงผ่าน Host `docker` และ Port `5433` ตามค่า `DATABASE_URL` ไม่ใช่ `localhost` ของ Job Container

เนื่องจาก `localhost` หมายถึง Container ที่กำลังรัน CI Job อยู่ ไม่ใช่ Docker Service ที่ให้บริการฐานข้อมูล

### 4. ทำไม Jenkins ต้องใช้ `docker compose down -v` ใน `post { always }`

Jenkins ใช้ Agent ที่สามารถถูกนำกลับมาใช้ในการ Build ครั้งถัดไป จึงต้องทำความสะอาด Containers, Networks และ Volumes หลังการทดสอบ

คำสั่ง `docker compose --profile e2e --profile tools down -v --remove-orphans` ช่วยลบทรัพยากรที่เกี่ยวข้องกับ Docker Compose และป้องกันข้อมูลทดสอบตกค้างหรือ Port ชนกันระหว่าง Build

การใช้ `post { always }` ทำให้ Cleanup ทำงานทั้งกรณี Pipeline สำเร็จและล้มเหลว

ส่วน GitHub Actions ใช้ Runner แบบชั่วคราว และ GitLab CI ในโจทย์ใช้ Docker-in-Docker ที่แยกตาม Job จึงไม่จำเป็นต้องจัดการ Cleanup ของ Agent แบบเดียวกับ Jenkins

## Part B: ผลที่เห็นใน GitHub Actions

### 1. ผลการรัน CI ครั้งแรก (Green)

ได้ Push โค้ดขึ้น GitHub Repository บน Branch `step/05-ci` ทำให้ GitHub Actions เริ่มทำงานโดยอัตโนมัติผ่านเหตุการณ์ `push`

ผลการรัน Workflow `CI #18` มีสถานะ **Success** โดยใช้เวลารวม 2 นาที 5 วินาที

| Job | ผลการทดสอบ | ระยะเวลา |
|---|---|---|
| Unit | Passed | 21 วินาที |
| Integration | Passed | 49 วินาที |
| E2E | Passed | 48 วินาที |

**สรุป:** CI Pipeline ทำงานครบทั้ง 3 Jobs ตามลำดับ Unit → Integration → E2E และทุก Job ผ่านการทดสอบ แสดงว่าโค้ดในรอบนี้ผ่านการตรวจสอบตามเงื่อนไขที่ Pipeline กำหนด

### 2. ผลการทดลอง CI ล้มเหลว (Red)

รอทดลองทำให้ Unit Test ล้มเหลวและ Push ขึ้น GitHub เพื่อสังเกตว่า Integration และ E2E ถูกข้ามหรือไม่

### 3. ผลการแก้ไขให้ CI กลับมาผ่าน (Green)

รอแก้ไข Unit Test ให้ถูกต้องและ Push อีกครั้ง เพื่อยืนยันว่า Pipeline กลับมาทำงานสำเร็จทุก Job

### 2. ผลการทดลอง CI ล้มเหลว (Red)

ทดลองเพิ่ม Unit Test ที่ตั้งใจให้ล้มเหลวในไฟล์ `app/test/unit/passwords.test.ts` โดยกำหนด `expect(1 + 1).toBe(3)` ซึ่งผลลัพธ์จริงคือ 2

หลังจาก Commit และ Push ไปยัง Branch `step/05-ci` พบว่า GitHub Actions Workflow `CI #19` มีสถานะ **Failure** โดยใช้เวลารวม 18 วินาที

| Job | ผลการทดสอบ | ระยะเวลา |
|---|---|---|
| Unit | Failed | 15 วินาที |
| Integration | Skipped | 0 วินาที |
| E2E | Skipped | 0 วินาที |

**สรุป:** เมื่อ Unit Test ไม่ผ่าน GitHub Actions จะข้าม Integration และ E2E โดยอัตโนมัติ เพราะกำหนด `needs: unit` และ `needs: integration` ทำให้ตรวจพบข้อผิดพลาดตั้งแต่ต้นและไม่เสียทรัพยากรในการทดสอบขั้นตอนถัดไป เป็นการทำงานตามหลักการ Fail Fast

### 3. ผลการแก้ไขให้ CI กลับมาผ่าน (Green)

หลังจากทดลองให้ Unit Test ล้มเหลว ได้ลบ Test ที่ตั้งใจให้ล้มเหลวออกจากไฟล์ `app/test/unit/passwords.test.ts`

จากนั้นรัน Unit Test ในเครื่อง พบว่า Test Suites ผ่าน 9/9 และ Tests ผ่าน 47/47

เมื่อ Commit และ Push การแก้ไขไปยัง Branch `step/05-ci` GitHub Actions เริ่ม Workflow `CI #20` โดยมีผลการทดสอบดังนี้

- Unit: Passed (18 วินาที)
- Integration: Passed (35 วินาที)
- E2E: อยู่ระหว่างดำเนินการ ณ เวลาที่ตรวจสอบ

**สรุป:** Unit และ Integration กลับมาผ่านแล้ว โดยต้องรอผล E2E เพื่อยืนยันว่า Pipeline สำเร็จครบทุก Job
### 3. ผลการแก้ไขให้ CI กลับมาผ่าน (Green)

หลังจากทดลองทำให้ Unit Test ล้มเหลว ได้ลบ Test Case ที่ตั้งใจให้ล้มเหลวออกจากไฟล์ `app/test/unit/passwords.test.ts` และรันทดสอบ Unit Tests ในเครื่องอีกครั้ง

ผลการทดสอบพบว่า Unit Tests ผ่านทั้งหมด 47 Tests จาก 9 Test Suites จากนั้น Commit และ Push การแก้ไขไปยัง Branch `step/05-ci` เพื่อให้ GitHub Actions ตรวจสอบอีกครั้งใน Workflow `CI #20`

การทดลองนี้แสดงให้เห็นว่าสามารถแก้ไขข้อผิดพลาดที่ตรวจพบจาก CI และทำให้ Unit Tests กลับมาผ่านได้ โดยผลการผ่านครบทั้ง Pipeline ของ CI #20 ควรตรวจสอบจากหน้า GitHub Actions อีกครั้ง

## Part C1: Coverage Gate

### 1. การเพิ่ม Coverage Gate

เพิ่ม Script `test:coverage` ในไฟล์ `app/package.json` เพื่อให้ Jest รัน Unit Tests พร้อมตรวจสอบ Code Coverage โดยใช้คำสั่ง

`jest --selectProjects unit --coverage`

จากนั้นกำหนด `collectCoverageFrom` ในไฟล์ `app/jest.config.js` ให้ตรวจสอบเฉพาะ Source Code ภายใน `src/domain/` และ `src/services/`

กำหนด Coverage Threshold ดังนี้

| Coverage Metric | เกณฑ์ขั้นต่ำ | ผลที่ได้ | สถานะ |
|---|---:|---:|---|
| Statements | 80% | 82.85% | Passed |
| Branches | 70% | 79.24% | Passed |
| Functions | 80% | 100% | Passed |
| Lines | 80% | 87.71% | Passed |

ผลการรัน `npm run test:coverage` พบว่า Unit Tests ผ่านทั้งหมด 47 Tests จาก 9 Test Suites และ Coverage ทุก Metric ผ่านเกณฑ์ขั้นต่ำที่กำหนด

### 2. การนำ Coverage Gate ไปใช้ใน CI

แก้ไขไฟล์ `.github/workflows/ci.yml` ให้ Unit Job เรียกใช้ `npm run test:coverage` และเพิ่มขั้นตอน `actions/upload-artifact@v4` สำหรับจัดเก็บรายงาน Coverage

เมื่อ Push โค้ดขึ้น GitHub พบว่า Workflow `CI #22` มีสถานะ Success และมี Artifact จำนวน 1 รายการ

**สรุป:** Coverage Gate ช่วยให้ CI ตรวจสอบได้ว่าโค้ดส่วนที่กำหนดมีระดับความครอบคลุมของการทดสอบไม่น้อยกว่าเกณฑ์ขั้นต่ำ หาก Coverage ต่ำกว่าเกณฑ์ Unit Job จะล้มเหลวและป้องกันไม่ให้ Pipeline ดำเนินต่อไปตามปกติ

## Part C2: Migration Rollback Test

### 1. การเพิ่ม Rollback Test

เพิ่ม Script `db:test-rollback` ในไฟล์ `app/package.json` เพื่อเริ่มฐานข้อมูลทดสอบและเรียกใช้ Liquibase ด้วยคำสั่ง `update-testing-rollback`

การทดสอบใช้ PostgreSQL Service `db-test` และฐานข้อมูล `election_test` ซึ่งแยกจากฐานข้อมูล Development

### 2. ผลการทดสอบ Rollback

ทดลองรันคำสั่ง `npm run db:test-rollback` โดยใช้ฐานข้อมูลทดสอบที่เริ่มใหม่

Liquibase ดำเนินการ 3 ขั้นตอน ดังนี้

1. **Update:** Apply Changesets จำนวน 7 รายการ เพื่อสร้างตารางและข้อมูลเริ่มต้น
2. **Rollback:** ย้อนกลับ Changesets ทั้ง 7 รายการ
3. **Update Again:** Apply Changesets ทั้ง 7 รายการกลับเข้าไปอีกครั้ง

ผลการทดสอบแสดงข้อความ

`Liquibase command 'update-testing-rollback' was executed successfully.`

แสดงว่า Changesets ที่ทดสอบสามารถ Apply, Rollback และ Apply ซ้ำได้สำเร็จ

### 3. การเพิ่ม Rollback Test ใน CI

แก้ไขไฟล์ `.github/workflows/ci.yml` ให้ Integration Job เรียกใช้ `npm run db:test-rollback` ก่อน `npm run test:integration`

หลัง Commit และ Push ขึ้น GitHub ได้ตรวจสอบ Workflow `CI #22` บน Branch `step/05-ci` ที่ Commit `aff772d`

| Job | ผลการทดสอบ | ระยะเวลา |
|---|---|---|
| Unit | Passed | 18 วินาที |
| Integration | Passed | 45 วินาที |
| E2E | Passed | 53 วินาที |
| **Overall CI** | **Success** | **2 นาที 2 วินาที** |

**สรุป:** การเพิ่ม Rollback Test ทำให้ CI สามารถตรวจสอบความสามารถในการย้อนกลับ Database Migration ก่อนรัน Integration Tests ช่วยลดความเสี่ยงจาก Changesets ที่ไม่สามารถ Rollback ได้

## คำถามท้าย Lab

### 1. ทำไม Code Coverage 100% ไม่ได้หมายความว่าโปรแกรมไม่มี Bug?

Code Coverage เป็นตัวชี้วัดว่าส่วนใดของ Source Code ถูกเรียกใช้งานระหว่างการทดสอบ แต่ไม่ได้ยืนยันว่าผลลัพธ์ของโปรแกรมถูกต้องทั้งหมด

แม้ Coverage จะเท่ากับ 100% ก็ยังอาจมีข้อผิดพลาด เช่น Test Case ตรวจสอบ Expected Result ไม่ถูกต้อง ไม่ครอบคลุมเงื่อนไขทางธุรกิจ หรือไม่ครอบคลุมข้อมูลและสถานการณ์ที่อาจเกิดขึ้นจริง

ดังนั้นการประเมินคุณภาพของ Software Testing ต้องพิจารณาทั้ง Coverage และคุณภาพของ Test Cases ร่วมกัน

### 2. ทำไม E2E Test ที่ใช้เวลา 15 นาทีจึงอาจไม่เหมาะกับการรันทุก Push?

E2E Test ใช้เวลาและทรัพยากรมากกว่า Unit Test เพราะต้องเตรียมฐานข้อมูล Application และสภาพแวดล้อมที่เกี่ยวข้อง

หาก E2E Test ใช้เวลา 15 นาทีและรันทุกครั้งที่ Push จะทำให้นักพัฒนาต้องรอผล CI นานขึ้น และอาจทำให้การแก้ไขข้อผิดพลาดหรือการส่งมอบโค้ดล่าช้า

แนวทางที่เหมาะสมคือรัน Unit Tests ที่รวดเร็วทุก Push และพิจารณาแบ่ง E2E Tests เป็นชุดสำคัญที่รันทุก Push กับชุดทดสอบเต็มที่รันตามรอบเวลาหรือก่อน Release โดยขึ้นอยู่กับความเสี่ยงและความต้องการของโครงการ

## สรุปผล Lab 05

จากการทดลอง Continuous Integration ได้เรียนรู้การจัดลำดับ Unit, Integration และ E2E Tests ตามหลัก Fail Fast การตรวจจับข้อผิดพลาดผ่าน GitHub Actions การกำหนด Coverage Gate และการตรวจสอบ Database Migration Rollback ด้วย Liquibase

ผลการทดลองยืนยันว่า CI สามารถตรวจจับ Unit Test ที่ล้มเหลว ข้าม Jobs ที่ขึ้นต่อกัน และกลับมาทำงานสำเร็จหลังแก้ไขข้อผิดพลาด รวมถึงตรวจสอบ Coverage และ Migration Rollback ได้ตามการตั้งค่าของโครงการ