# Step 00 — Setup

## ตาราง test boundaries

| | unit | integration | e2e |
|---|---|---|---|
| เวลาที่ใช้ (โดยประมาณ) | ~0.9 วินาที | ~1.3 วินาที (เฉพาะ Jest ไม่รวมเปิด DB + migrate) | ~23 วินาทีทั้งคำสั่ง (ตัว test ~0.5 วินาที ที่เหลือคือเปิด DB, migrate, build container) |
| ต้องมี Docker ไหม | ไม่ต้อง | ต้อง (Postgres + Liquibase) | ต้อง (DB e2e + build และรัน app container) |
| ถ้า test พัง บอกได้แม่นแค่ไหนว่าพังที่ไหน | แม่นที่สุด ชื่อ test กับบรรทัดที่ fail ชี้ไปที่การคำนวณเลขตรวจโดยตรง | ปานกลาง รู้ว่า flow สมัครสมาชิกพัง (ได้ 400 แทน 201) แต่ต้องโยงเองว่าสาเหตุคืออะไร | แม่นน้อยที่สุด ผ่านหลายชั้นพร้อมกัน (HTTP, app, DB, container) พังแล้วต้องไล่หาเอง |

## Red → Green (ข้อ 3)

สิ่งที่ทำ: เปลี่ยน `(13 - i)` เป็น `(12 - i)` ในสูตรคำนวณเลขตรวจของ
`app/src/domain/thaiNationalId.ts` เพื่อจำลองบั๊กเล็กๆ แล้วดูว่า test จับได้ไหม

ผลที่เห็น:

- unit: แดง 1 จาก 6 ข้อ คือข้อ "accepts an id whose last digit matches the checksum"
  (`Expected: true, Received: false`) อีก 5 ข้อยังเขียว
- integration: แดง ที่ขั้นสมัครสมาชิก (`Expected: 201, Received: 400`)
  ซึ่งสอดคล้องกับ unit คือเลขบัตรที่ถูกต้องถูกปฏิเสธ
- แก้คืนเป็น `(13 - i)` แล้วเขียวทั้งสองระดับ (commit แยก 2 ครั้งเพื่อให้เห็นวงจร
  red → green ใน git history)

ข้อสังเกต:

1. test "rejects an id with a wrong checksum digit" ยังเขียวทั้งที่โค้ดผิด
   เพราะบั๊กทำให้ฟังก์ชันปฏิเสธเลขที่ถูกอยู่แล้ว เลขที่ผิดจึงถูกปฏิเสธเหมือนเดิม
   แปลว่า test ที่ตรวจแต่ฝั่ง "ปฏิเสธ" จับบั๊กนี้ไม่ได้ ต้องมี happy path คู่กัน
2. บั๊กจุดเดียวกัน unit ชี้ตำแหน่งได้ทันทีจากชื่อ test ส่วน integration
   บอกแค่อาการระดับ flow (400 ซึ่งเกิดได้จากหลายสาเหตุ)

## ปัญหาที่เจอระหว่างทาง: e2e build ไม่ผ่าน

- อาการ: `npm run test:e2e` ล้มตอน build container ที่ขั้น `RUN npm ci`
  ด้วย error ว่า `package.json` กับ `package-lock.json` ไม่ตรงกัน
  (Missing `@emnapi/core`, `@emnapi/runtime` จาก lock file)
- ลองแก้รอบแรก: `npm install` บนเครื่อง ลด error ลงแต่ยังไม่หมด
- แก้ได้จริง: สร้าง lock ใหม่ด้วย npm ใน image เดียวกับที่ Dockerfile ใช้
  `docker run --rm -v "$PWD":/app -w /app node:24-alpine npm install --package-lock-only`
  หลังจากนั้น `npm ci` ใน Docker ผ่านและ e2e ผ่าน
- สิ่งที่เรียนรู้: lock file ที่สร้างบนเครื่องหนึ่งอาจใช้ `npm ci` ในอีกสภาพแวดล้อมไม่ได้
  ควรสร้างด้วย npm ตัวเดียวกับที่ใช้ build จริง

## แนวคิดที่ใช้

- Test boundaries / test pyramid: แบ่ง test ตามขอบเขตที่ครอบคลุม
  - Unit test ทดสอบหน่วยเล็กๆ (เช่น ฟังก์ชันตรวจเลขบัตร) ไม่แตะ I/O จึงเร็ว
    และชี้จุดพังได้แม่น ควรมีมากที่สุด
  - Integration (component) test ทดสอบหลายส่วนทำงานร่วมกัน (app + Postgres จริง)
    ช้ากว่า แต่จับปัญหารอยต่อระหว่างส่วนได้
  - E2E test ยิง HTTP กับระบบที่ build เป็น container ใกล้ของจริงที่สุด
    ช้าที่สุดและชี้จุดพังได้กว้างที่สุด ควรมีน้อยที่สุด
- Trade-off: ยิ่งระดับสูง ยิ่งเชื่อมั่นว่าระบบทำงานจริง แต่ยิ่งช้าและหาสาเหตุยาก
  จึงใช้ unit เป็นฐาน แล้วเติมระดับบนเท่าที่จำเป็น
- Red → Green: เห็น test แดงเพราะบั๊กก่อน แล้วแก้ให้เขียว
  เพื่อพิสูจน์ว่า test ตรวจจับปัญหาได้จริง ไม่ใช่ผ่านเพราะไม่ได้ตรวจอะไร
- แยกสภาพแวดล้อมของแต่ละระดับ: test DB กับ e2e DB เป็นคนละ database
  และใช้ Liquibase context ควบคุมว่าข้อมูลชุดไหนถูกสร้างที่ไหน
  - changeset ที่ไม่มี context (8 ตัว: สร้างตาราง, seed เขตเลือกตั้ง ฯลฯ) รันทุกที่
  - `context:dev` (900-dev-seed, 3 ตัว) ข้อมูลสาธิตสำหรับเครื่อง developer
    ไม่รันทั้ง test DB และ e2e DB
  - `context:e2e` (901-e2e-seed, 2 ตัว) บัญชีและการเลือกตั้งสำหรับ e2e
    รันเฉพาะ e2e DB (migrate ด้วย `LIQUIBASE_COMMAND_CONTEXTS=e2e`)
  - ผลที่เห็นใน log: e2e รัน 10 ตัว กรองออก 3 / test DB รัน 8 ตัว กรองออก 5
  - ประโยชน์: ข้อมูล seed ของแต่ละระดับไม่ปนกัน (test isolation)
    และ schema เดียวกันถูกสร้างจาก changelog ชุดเดียว