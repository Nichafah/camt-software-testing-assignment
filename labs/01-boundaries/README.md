# Lab 01 — Test Boundaries

**Reference:** Toby Clemson, [Testing Strategies in a Microservice Architecture](https://martinfowler.com/articles/microservice-testing/)
**เวลา:** ~60 นาที · **ทำเป็นคู่**

## แนวคิดสั้น ๆ

| Boundary | ทดสอบอะไร | ใน repo นี้ |
|---|---|---|
| **Unit** | logic ชิ้นเล็กที่สุด, collaborator เป็น test double (solitary) หรือของจริงที่ไม่มี I/O (sociable) | `test/unit/` |
| **Integration** | โค้ดของเราคุยกับของภายนอกได้ถูกต้อง (DB, HTTP client) — ทดสอบ *gateway* | `PgUserRepository` + Postgres จริง |
| **Component** | service ทั้งตัวแบบแยกเดี่ยว ผ่าน interface ภายนอก (HTTP) — ของภายนอกที่ไม่ใช่ของเราเป็น double | `test/integration/` (supertest + Postgres) |
| **Contract** | ผู้ใช้ API (consumer เช่น frontend) กับ API (provider) ตกลงรูปร่างข้อมูลกันไว้ตรงกัน | — (พูดถึงเป็น concept) |
| **End-to-end** | ระบบทั้งหมดเหมือน production, ผ่าน user journey | `e2e/` (Playwright → app container) |

คำถามหลักของทุก test: **"ถ้า test นี้แดง เรารู้ได้แม่นแค่ไหนว่าพังเพราะอะไร และต้องจ่ายเท่าไหร่ (เวลา, ความเปราะ) เพื่อรู้"**

## Part A — จัดกลุ่ม test cases ของระบบอ้างอิง (20 นาที)

เปิด [`worksheet.md`](worksheet.md) แล้วระบุ boundary ที่ *เหมาะที่สุด* ของแต่ละข้อ พร้อมเหตุผลสั้น ๆ

- บางข้อตอบได้มากกว่า 1 ระดับ → เลือกระดับที่ **ต่ำที่สุดที่ยังให้ความมั่นใจพอ** และบอกว่าระดับที่สูงกว่าจำเป็นไหม
- บางข้อ *ไม่ใช่* automated functional test เลย → ระบุด้วยว่าควรทดสอบด้วยวิธีอื่นอย่างไร

## Part B — จัดกลุ่ม test cases ของตัวเอง (25 นาที)

นำ test cases ที่เตรียมมา (Lab 00 ข้อ 5) เพิ่มคอลัมน์:

| ID | Given / When / Then | Boundary | ต้องใช้ test double อะไร | ต้องเตรียมข้อมูลอะไร |
|---|---|---|---|---|

จากนั้นนับจำนวนในแต่ละระดับ แล้ววาดรูปร่างของ test suite ตัวเอง:

```
        /\         e2e         : __ ข้อ
       /  \        component   : __ ข้อ
      /    \       integration : __ ข้อ
     /______\      unit        : __ ข้อ
```

คำถาม:
1. รูปร่างเป็น pyramid, ice-cream cone หรือ hourglass?
2. เลือก **2 ข้อที่เป็น e2e** แล้วเขียนใหม่ให้ทดสอบที่ระดับต่ำลงได้ไหม? ต้องเปลี่ยนโค้ดอะไรในระบบของตัวเองถึงจะทำได้?

## Part C — Readiness Checklist รอบแรก (15 นาที)

ให้คะแนนโปรเจกต์ของตัวเองใน [`checklist/`](../../checklist/) — เก็บไว้เทียบกับรอบสุดท้ายตอนจบ Day 2

## ส่งท้าย

แต่ละคู่เล่า 1 ข้อที่ถกกันนานที่สุด ว่าเลือก boundary ไหนและทำไม
