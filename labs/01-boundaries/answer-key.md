# Answer Key — Lab 01

หลักที่ใช้ตัดสิน: **ระดับต่ำที่สุดที่ยังให้ความมั่นใจพอ** — กฎทางธุรกิจทดสอบที่ unit, การ "ต่อสาย" (routing, auth, SQL, serialization) ยืนยันที่ component/integration แค่พอ, e2e เก็บไว้เฉพาะ journey สำคัญ

| # | Test case | Boundary | เหตุผล |
|---|---|---|---|
| 1 | checksum ผิดถูกปฏิเสธ | **U** | pure function (`isValidThaiNationalId`) ไม่มี I/O — ครอบคลุมทุก edge case ได้ถูกและเร็ว |
| 2 | เขตที่ไม่มีอยู่ → 400 | **U** + C 1 ข้อ | กฎอยู่ใน `AccountService` → unit ด้วย stub `DistrictRepository`. component 1 ข้อพอเพื่อยืนยันว่า `ValidationError` แปลงเป็น HTTP 400 |
| 3 | repository map column ถูก | **I** | สิ่งที่อาจผิดคือ SQL และ mapping กับ schema จริง — mock database ไม่ช่วยเลย ต้องใช้ Postgres จริง |
| 4 | VOTER → `POST /parties` ได้ 403 | **C** | เป็นเรื่อง middleware + route wiring ต้องผ่าน HTTP จริง (supertest) แต่ไม่ต้องทั้งระบบ |
| 5 | journey ลงทะเบียน → ผลคะแนน | **E** | คุณค่าอยู่ที่ "ทุกชิ้นทำงานร่วมกันได้จริง" — มีไม่กี่ข้อแบบนี้ก็พอ (นี่คือ acceptance test ของ Lab 06) |
| 6 | รหัสผ่านเก็บเป็น hash | **U** | spy `UserRepository.create` แล้วตรวจว่า `passwordHash` ≠ รหัสผ่าน และ `verifyPassword` ผ่าน |
| 7 | หมายเลขผู้สมัครห้ามซ้ำ | **U** + I | กฎใน `ElectionAdminService` → unit ด้วย fake repository. constraint `UNIQUE (district_id, number)` ใน DB เป็นด่านสุดท้ายกัน race condition → integration ถ้าต้องการยืนยัน |
| 8 | changelog apply บน DB เปล่าได้ | **I** (pipeline) | ไม่ต้องเขียน test แยก — `npm run test:integration` ทำทุกครั้งอยู่แล้ว และ CI สร้าง DB ใหม่ทุก run |
| 9 | ก่อนปิดหีบไม่แสดงคะแนน | **U** + C | กฎการซ่อน/แสดงคะแนน → unit. component 1 ข้อยืนยันรูปร่าง JSON ที่ออกจาก API |
| 10 | frontend คาด field `closed`, `votes` | **K** | consumer-driven contract (เช่น Pact): frontend เขียน expectation, backend verify ใน CI — จับ breaking change โดยไม่ต้องรัน e2e |
| 11 | JWT หมดอายุใช้ไม่ได้ | **U** | `JwtTokenService` + fake timers (`jest.useFakeTimers`) — ไม่ต้องรอจริง 1 ชั่วโมง |
| 12 | admin ตั้ง กกต. แล้วสร้างพรรคได้ | **C** | 2 request ผ่าน HTTP + DB จริงใน process เดียว. ถ้าเป็น journey หลักของธุรกิจ อาจมี e2e ด้วย |
| 13 | 1,000 votes/นาที | **X** | performance/load test (k6, Gatling, JMeter) — non-functional ไม่อยู่ใน pyramid |
| 14 | เห็นเฉพาะผู้สมัครในเขตตัวเอง | **C** | ตอนนี้กฎอยู่ใน SQL ของ legacy route → ต้องทดสอบผ่าน HTTP + DB. ถ้า refactor แยก logic ออกมา (Lab 07) จะลงไปเป็น unit ได้ |
| 15 | หน้าพรรคสวยบนมือถือ | **X** | manual / exploratory หรือ visual regression (Playwright screenshot) — "สวย" ตัดสินอัตโนมัติยาก |
| 16 | หลังปิดหีบเปลี่ยนคะแนนไม่ได้ | **C** → U | ตอนนี้ต้อง characterization ผ่าน component เพราะ legacy handler; หลัง sprout logic ออกมา (Lab 07) กฎจะทดสอบที่ unit ได้ |

## ประเด็นชวนคุย

- **ข้อ 14 และ 16:** boundary ที่ "ต่ำที่สุดที่เป็นไปได้" ขึ้นกับ **design ของโค้ด** ไม่ใช่แค่ตัว requirement — โค้ดที่ไม่มี seam บังคับให้เราทดสอบที่ระดับสูง (ช้า เปราะ)
- **ข้อ 2, 7, 9:** รูปแบบ "กฎที่ unit + wiring ที่ component 1 ข้อ" คือหัวใจของ pyramid — ไม่ต้องทดสอบทุก edge case ผ่าน HTTP
- **ข้อ 8:** บาง "test" เป็นผลพลอยได้ของ pipeline ที่ออกแบบดี
