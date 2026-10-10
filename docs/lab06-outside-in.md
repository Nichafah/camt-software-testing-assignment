# Lab 06 — Outside-In: Poll Closing and Results

## คำถามปิด Lab

### 1. Test ระดับไหนช่วยออกแบบมากที่สุด? ระดับไหนช่วยยืนยันว่าต่อสายถูก?

Unit Test ช่วยออกแบบโครงสร้างภายในระบบมากที่สุด เพราะทำให้ค้นพบว่า PollService จำเป็นต้องพึ่งพา Clock, DistrictRepository และ VoteRepository อย่างไร

Integration Test ช่วยตรวจสอบการทำงานร่วมกันระหว่าง Route, Service และ Database ส่วน Acceptance Test (E2E) ช่วยยืนยันว่าระบบทั้งหมดทำงานได้จริงตามความต้องการของผู้ใช้

### 2. ถ้าเขียนแบบ Inside-Out จะต่างไปอย่างไร? ความเสี่ยงคืออะไร?

Inside-Out เริ่มพัฒนาจาก Database → Repository → Service → Route แล้วจึงเขียน Acceptance Test

ส่วน Outside-In เริ่มจาก Acceptance Test ตามความต้องการของผู้ใช้ แล้วค่อยพัฒนาส่วนประกอบภายใน

ความเสี่ยงของ Inside-Out คืออาจพัฒนาโครงสร้างหรือฟังก์ชันที่ไม่ตรงกับความต้องการจริง และตรวจพบปัญหาการเชื่อมต่อระหว่างส่วนประกอบช้า

### 3. Acceptance Test 1 ตัวใช้เวลาเท่าไหร่เทียบกับ Unit Test ทั้งหมด? ควรมี Acceptance Test กี่ตัว?

Acceptance Test (E2E) โดยทั่วไปใช้เวลามากกว่า Unit Test เพราะต้องทดสอบระบบจริงผ่าน HTTP, Application และ Database รวมถึงการเตรียมสภาพแวดล้อมด้วย Docker

ควรมี Acceptance Test สำหรับ User Journey และ Acceptance Criteria ที่สำคัญ ส่วนกรณีย่อยและเงื่อนไขต่าง ๆ ควรทดสอบด้วย Unit Test หรือ Integration Test เพื่อให้การทดสอบรวดเร็วและดูแลรักษาง่าย

## ผลการทดสอบ

- TypeScript Typecheck: Passed
- Unit Tests: 54 Passed
- Integration Tests: 13 Passed
- E2E Tests: 2 Passed
- Database Migration และ Rollback: Passed

## สรุป

Lab 06 ใช้แนวทาง Outside-In TDD โดยเริ่มจาก Acceptance Test แล้วพัฒนาระบบผ่านวงจร Unit Test และ Integration Test จนสามารถปิดหีบเลือกตั้งและประกาศผลคะแนนได้ตาม Acceptance Criteria