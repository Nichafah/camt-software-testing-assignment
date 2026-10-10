1. เป้าหมายของ lab

เทสต์ที่ทดสอบผ่านฐานข้อมูลจริงต้องมีข้อมูลก่อนเสมอ เช่น จะทดสอบว่ากรรมการสร้างพรรคได้ ต้องมีกรรมการอยู่ในตาราง users ก่อน คำถามของ lab นี้คือ ข้อมูลนั้นควรมาจากไหน และทำยังไงให้เทสต์ไม่กวนกัน คำตอบแบ่งเป็นสองฝั่ง: โครงสร้างตารางมาจาก migration ส่วนข้อมูลของแต่ละเทสต์ให้เทสต์สร้างเอง

2. Test Data Builder
Builder แก้เรื่องนี้ด้วยการเติมค่าที่ใช้ได้ให้ทุกช่อง แล้วให้เทสต์ระบุเฉพาะช่องที่สำคัญ ในเทสต์ shows a voter only the candidates of their own district 
3. Given helper

Builder แค่สร้าง object ในหน่วยความจำ ยังไม่ได้ลงฐานข้อมูล given คือขั้นที่นำ object นั้นไป insert จริง

เหตุผลที่ insert ผ่าน repository แทนการเรียก API: ถ้าต้องสร้างกรรมการผ่าน API จะต้อง register, ให้ admin เลื่อน role, แล้ว login ซึ่งเป็นสามขั้นที่ไม่เกี่ยวกับสิ่งที่เทสต์ต้องการตรวจ และถ้าขั้นใดขั้นหนึ่งมีบั๊ก เทสต์เรื่องสร้างพรรคจะแดงไปด้วยทั้งที่การสร้างพรรคไม่ได้ผิด

4. Fresh fixture

ดูเทสต์ rejects a duplicate party name (409)มันสร้างพรรคชื่อ "พรรคก้าวหน้า" แล้วคาดว่าการสร้างซ้ำได้ 409

ถ้าไม่มี truncateAll พรรคนี้จะค้างในฐานข้อมูล รอบถัดไป given.party(...) จะพังตั้งแต่ขั้นเตรียมข้อมูลเพราะชื่อซ้ำ และเทสต์อื่นที่นับจำนวนผู้สมัครหรือพรรคจะได้ตัวเลขเกิน ผลเทสต์จึงขึ้นกับว่ารันอะไรมาก่อน
5. Seed ผ่าน migration

ข้อมูล seed มีไว้ให้คนใช้ ไม่ใช่ให้เทสต์ใช้ นักพัฒนาเปิดแอปแล้วต้องมีบัญชีให้ login จึงมี 900 และ 902 ใน context
6. ปัญหาที่เจอ

 Compose มองคนละโฟลเดอร์ เรื่องที่สองคือ YAML อ่านการเยื้องไม่เหมือนที่ตาเห็น เรื่องที่สามคือ container ใช้ไฟล์ที่ถูกก๊อปไว้ตอน build ไม่ใช่ไฟล์บนเครื่อง

## คำสั่งที่ใช้รัน
รันจากโฟลเดอร์ `app/` และต้องเปิด Docker ไว้

```bash
# เปิดฐานข้อมูลทดสอบ
docker compose up -d db-test

# build image ของ Liquibase ใหม่ทุกครั้งที่แก้ไฟล์ใน db/
docker compose build liquibase
docker compose run --rm liquibase validate

# รัน migration พร้อม seed ของ dev
docker compose run --rm liquibase update --contexts=dev

# นับกรรมการ (ได้ 6)
docker compose exec db-test psql -U election -d election_test \
  -c "SELECT count(*) FROM users WHERE role = 'COMMISSIONER'"

# ถอย changeset ล่าสุด (902) แล้วนับใหม่ (ได้ 1)
docker compose run --rm liquibase rollback-count --count=1 --contexts=dev

# ใส่กลับ (ได้ 6) และดูประวัติ
docker compose run --rm liquibase update --contexts=dev
docker compose run --rm liquibase history

# รันเทสต์
npm run test:unit
npm run test:integration
```