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