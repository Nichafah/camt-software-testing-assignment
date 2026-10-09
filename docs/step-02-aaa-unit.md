# Step 02 — Arrange / Act / Assert

## แนวคิด

test ที่ดีแบ่งเป็น 3 ช่วงเรียงกัน คือ Arrange เตรียมของที่ต้องใช้ Act ทำสิ่งที่ทดสอบครั้งเดียว
และ Assert ตรวจผลของ Act นั้น กติกาที่ใช้ตัดสินใน lab นี้คือ 1 test ตรวจ 1 พฤติกรรมและชื่อ test
บอกว่าระบบควรทำอะไร, Act ครั้งเดียว (ถ้ามีหลายครั้งแปลว่ามี test หลายข้อซ่อนอยู่),
ไม่มี `for` หรือ `if` ใน test (ใช้ `it.each` แทน) และเมื่อ test แดง ชื่อกับข้อความ error
ต้องพอให้รู้ว่าอะไรพังโดยไม่ต้องเปิดไฟล์ ซึ่งตรงกับที่เห็นใน lab 00 ว่าชื่อ test ที่ดี
ชี้จุดพังได้ทันที

## Part A — จับ smell ใน lab02-smelly.test.ts

| Smell | อยู่บรรทัดไหน | ปัญหาคืออะไรเมื่อ test แดง |
|---|---|---|
| Obscure Test | 7, 8, 38 (ชื่อ `stuff`, `works`, `hash`), 9 และ 14-18 (id ลอยๆ ในอาร์เรย์ แล้วอ้างผ่าน `results[0..4]`), 20, 22, 30, 32 (ตัวแปร `h`, `h2`, `c`, `c2`) | อ่านชื่อ test ไม่รู้ว่าระบบควรทำอะไร และ `results[1]` ไม่บอกว่าคือ id ไหนหรือทำไมต้องเป็น false ต้องนับตำแหน่งในอาร์เรย์เอง |
| Eager Test | 8-36 (test เดียวตรวจ 3 เรื่อง: เลขบัตร รหัสผ่าน config) | พังข้อเดียวแล้ว test หยุดที่ expect นั้น บรรทัดหลังจากนั้นไม่ได้รัน เลยไม่รู้ว่ามีอะไรพังซ้อนอยู่อีก |
| Assertion Roulette | 14-18, 21, 26-28, 31, 33-35 (expect 13 ตัวใน test เดียว ไม่มีข้อความอธิบาย) | error บอกแค่ `Expected / Received` กับเลขบรรทัด ต้องเปิดไฟล์เพื่อเดาว่าตัวไหนพัง |
| Conditional Test Logic | 11-13 (`for` วนเก็บผล), 23-25 (`if` แล้ว `throw new Error('same hash')`) | logic ใน test เองอาจมีบั๊ก และ error `same hash` ไม่บอกว่าใช้รหัสอะไร |
| Test ที่ไม่มี assertion | 38-40 (`it('hash')` แค่เรียก `hashPassword('x')`) | ผ่านเสมอตราบใดที่ไม่ throw ต่อให้ hash ผิดก็ไม่แดง |

นอกจากนี้ test `works` เรียก Act หลายรอบในข้อเดียว (`isValidThaiNationalId`, `hashPassword`,
`verifyPassword`, `loadConfig`) ซึ่งผิดกติกาข้อ Act ครั้งเดียว

## ทดลอง: ให้ hashPassword คืน plain text

เพิ่มบรรทัด `return password;` ไว้บนสุดของ `hashPassword` ใน `src/auth/passwords.ts` แล้วรัน
`npm run test:unit` ผลคือ test แดง 1 จาก 8 คือ `stuff › works` ที่บรรทัด 21
(`expect(h).not.toBe('voter1234')`) ข้อความ error คือ `Expected: not "voter1234"`

สิ่งที่สังเกตได้:
- error ไม่ได้บอกว่า "รหัสผ่านถูกเก็บเป็น plain text" ต้องเปิดไฟล์อ่านบรรทัด 21 ถึงจะเข้าใจ
- test หยุดที่ expect แรกที่พัง บรรทัด 22-35 (เช็ก salt, verify, config) จึงไม่ได้รันเลย
  ถ้ามีบั๊กอื่นซ่อนอยู่ก็มองไม่เห็นจนกว่าจะแก้ข้อแรก
- test `hash` ที่ไม่มี assertion ยังผ่านทั้งที่โค้ดผิด แสดงว่าไม่ได้ปกป้องอะไรเลย
- แก้คืนแล้ว test เขียวทั้ง 8 ข้อ (commit แยกไว้ใน git history)

## Part B — Refactor

แยก `lab02-smelly.test.ts` ออกเป็น 3 ไฟล์ตามโมดูลที่ถูกทดสอบ คือ `thaiNationalId.test.ts`,
`passwords.test.ts` และ `config.test.ts` แต่ละ test ตรวจพฤติกรรมเดียว ตั้งชื่อให้อ่านแล้วรู้ว่า
ระบบควรทำอะไร และเขียนเป็น Arrange / Act / Assert ที่ชัดเจน

สิ่งที่เปลี่ยน:
- loop และ `if ... throw` ถูกแทนด้วย `it.each` และ assertion ตรงๆ
- test ก้อนเดียวที่ตรวจ 3 เรื่องถูกแตกเป็น 14 test ชื่อสื่อความหมาย
  (ไม่นับเคสใน `it.each`) แต่ละข้อแดงแยกกันได้
- test `hash` ที่ไม่มี assertion ถูกแทนด้วย test ที่ตรวจว่าไม่เก็บรหัสผ่านเป็น plain text
- เติมเคสที่ไฟล์ `thaiNationalId.test.ts` เดิมขาด คือเลขบัตรที่ถูกต้องตัวที่สอง
  และตัวอักษร 13 ตัว และเพิ่มการอ่าน `DATABASE_URL` ใน config ที่ไม่เคยมี test
- test เรื่อง salt ต้องเรียก `hashPassword` สองรอบ จึงย้ายรอบแรกไปไว้ใน Arrange
  ให้ Act เหลือรอบเดียว

ทดลองใส่บั๊ก `return password;` ใน `hashPassword` อีกรอบหลัง refactor
(ผลที่ได้: ใส่ผลจริงที่คุณเห็น)

### ทำไม `loadConfig(env)` ที่รับ env เป็น parameter ถึงทดสอบง่ายกว่า

ถ้าฟังก์ชันอ่าน `process.env` ตรงๆ ใน test ต้องแก้ค่าใน `process.env` ที่เป็น global ก่อนเรียก
และต้องจำไว้ว่าต้องเก็บค่าเดิมคืนหลังจบทุกครั้ง ถ้าลืม ค่าที่แก้จะรั่วไปกระทบ test ข้ออื่น
ทำให้ test ผ่านหรือแดงขึ้นกับลำดับที่รัน พอรับ env เป็น parameter test ส่ง object เล็กๆ เข้าไปตรงๆ
ไม่แตะ global ใดเลย แต่ละ test เป็นอิสระต่อกัน และค่า default `= process.env`
ทำให้โค้ดจริงยังใช้งานได้เหมือนเดิม นี่คือ seam ตามที่ checklist ข้อ 10 พูดถึง

ทดลองใส่บั๊ก return password; ใน hashPassword อีกรอบหลัง refactor (หลังเพิ่ม return password; ในฟังก์ชัน hashPassword พบว่า Test ที่ตรวจสอบการ hash รหัสผ่านล้มเหลว เนื่องจากผลลัพธ์เป็นรหัสผ่านต้นฉบับแทนค่า hash ทำให้ตรวจพบข้อผิดพลาดได้จาก Test ที่ระบุพฤติกรรมอย่างชัดเจน: **Experiment: Introduce a bug in `hashPassword`**

* **Change:** Temporarily added `return password;` at the beginning of `hashPassword`.
* **Command:** `npm run test:unit`
* **Actual result:** 3 tests failed and 17 tests passed. One test suite failed and two test suites passed.
* **Failed tests:**

  1. `does not store the password in plain text` — received `"voter1234"` instead of a hashed value.
  2. `produces a different hash each time for the same password (salt)` — the two returned values were identical.
  3. `returns true for the correct password` — received `false` instead of `true`.
* **Observation:** After refactoring the original smelly test into separate tests, each failure identifies a specific password-related behavior. The test names and assertion messages make the defects easier to locate.
* **Recovery:** Restore the original `hashPassword` implementation and rerun the unit tests to verify that they pass.
)