# Step 03 — Test Doubles
# Step 03 — Test Doubles

## แนวคิด

test double คือตัวแทนที่ใส่แทน dependency จริงตอนทดสอบ เพื่อให้ตรวจโค้ดของเราโดยไม่ต้องพึ่ง DB หรือของข้างนอก
ทำได้เพราะ `AccountService` รับ repository และ `TokenService` ผ่าน constructor ซึ่งเป็น seam ให้เสียบตัวแทนได้
แบ่งตามหน้าที่ได้ 5 แบบ:

- Dummy ต้องส่งให้ครบ แต่ไม่ควรถูกใช้เลย ผมทำให้มัน throw ถ้าถูกเรียก เพื่อให้ test แดงทันทีถ้าโค้ดไปใช้มันโดยไม่ตั้งใจ
- Stub ป้อนค่าที่ควบคุมได้ให้โค้ดที่ทดสอบ (input ทางอ้อม)
- Spy แอบบันทึกว่าถูกเรียกด้วยอะไร เพื่อมา assert ทีหลัง (output ทางอ้อม)
- Mock ถูกตั้งความคาดหวังว่าต้องถูกเรียก (หรือห้ามถูกเรียก) อย่างไร
- Fake เป็นของจริงแบบย่อที่ทำงานได้จริง เช่น เก็บข้อมูลใน array แทน Postgres

ใน Jest ทั้ง stub, spy และ mock สร้างจาก `jest.fn()` ตัวเดียวกัน ต่างกันที่เราใช้ทำอะไร
ตัวเดียวอาจทำสองหน้าที่ เช่น `users.findByNationalId` เป็น stub ตอนป้อนค่า

## test แต่ละข้อใช้ double ตัวไหน

AccountService.register
- registers a voter in an existing district: stub (`districts.findById` คืนเขต CM-1) และ dummy (`tokens`)
- rejects an unknown district: stub คืน null
- stores a hash, never the plain-text password: spy ที่ `users.create` ดู `mock.calls[0]`
- rejects a national id already registered: fake (`InMemoryUserRepository` ที่ใส่ผู้ใช้เดิมไว้ก่อน)
- does not save anything when the national id is invalid: mock ว่า `create` ต้องไม่ถูกเรียก

AccountService.login
- issues a token for the user: mock ที่ `tokens.issue` ต้องถูกเรียกด้วย principal ที่ถูกต้อง
- rejects a wrong password: mock ว่า `tokens.issue` ต้องไม่ถูกเรียก

AccountService.changeRole
- refuses to make anyone an ADMIN: mock ว่า `updateRole` ต้องไม่ถูกเรียก

ElectionAdminService.addCandidate: ใช้ fake ทั้ง 3 repository (`test/support/inMemoryRepositories.ts`) ทั้ง 5 ข้อ
JwtTokenService: ไม่ใช้ double แต่ใช้ fake timers ควบคุมเวลาแทน

## Part B — เมื่อไหร่ใช้ fake แทน jest.fn()

ใช้ fake เมื่อ dependency ต้องจำสถานะข้ามการเรียก เช่น เพิ่มผู้สมัครแล้ว `findByDistrict` ต้องเห็นคนที่เพิ่งเพิ่ม
ถ้าใช้ `jest.fn()` ต้องไล่ตั้ง `mockResolvedValueOnce` ทีละรอบและต้องรู้ว่า service เรียกกี่ครั้งตามลำดับไหน
ซึ่งผูก test กับ implementation มาก ส่วน fake ทำงานตามสัญญาของ interface เองจึงทนต่อการเปลี่ยน implementation กว่า
ส่วน stub เหมาะกับกรณีง่ายที่ต้องการแค่ค่าคงที่ค่าเดียว

fake ต้องไม่ "โกหก": ที่ผมทำให้เหมือนของจริงคือเรียงลำดับแบบเดียวกัน (`findByDistrict` ตามหมายเลข, `findAll` ตามชื่อ)
และเลียนแบบ foreign key ของ candidates (ไม่มีพรรคนั้นก็ไม่ให้สร้าง) แต่ยังมีจุดที่ต่างจากของจริง
คือ fake ไม่บังคับ `UNIQUE (district_id, number)` และ `UNIQUE (district_id, party_id)` ที่ DB บังคับ
และการเรียงชื่อด้วย `localeCompare` อาจไม่ตรงกับ collation ของ Postgres วิธีป้องกันคือ contract test
ที่รันชุดเดียวกันกับทั้ง fake และ Pg repository (ไว้ทำใน Lab 04)

## Part C — เวลาเป็น dependency

test ข้อ token หมดอายุใช้ `jest.useFakeTimers({ now })` แล้ว `jest.setSystemTime` เลื่อนไปเลย 60 วินาทีไป 1 วินาที
โดยไม่ต้องรอจริง และคืน `jest.useRealTimers()` ใน `afterEach` เพื่อไม่ให้กระทบ test ข้ออื่น
ผมเพิ่ม test ขอบเขตอีกข้อ (59 วินาทียังใช้ได้) ผ่านด้วย

fake timers กับการ inject `Clock` ต่างกันที่ fake timers ไม่ต้องแก้โค้ดที่ทดสอบ แต่เปลี่ยนเวลาของทั้งโปรเซส
ส่วน `Clock` ต้องแก้โค้ดให้รับเวลาเข้ามาผ่าน constructor แต่ควบคุมเฉพาะจุดและอ่านง่ายกว่า
`Clock` จึงเหมาะกับโค้ดของเราเอง ส่วน library ที่เราแก้ไม่ได้ อย่าง `jsonwebtoken` ที่อ่านเวลาเองข้างใน
ต้องใช้ fake timers

## คำถามปิด lab

test ที่เปราะที่สุดคือข้อที่ตรวจ `toHaveBeenCalledWith({ userId: 7, role: 'VOTER', districtId: 'CM-1' })`
และข้อที่อ่าน `users.create.mock.calls[0]` เพราะผูกกับรูปร่างของข้อมูลและลำดับการเรียกของ implementation
ถ้าเปลี่ยนวิธีทำงานภายในแต่พฤติกรรมเดิม test อาจแดงทั้งที่ไม่มีบั๊ก ส่วน `not.toHaveBeenCalled()` ทนกว่า

ไม่ควร mock `pg.Pool` ตรงๆ เพราะ Pool ไม่ใช่ของเรา และ API กว้าง test จะผูกกับข้อความ SQL ที่เปลี่ยนบ่อย
ส่วน repository interface เป็นสัญญาที่เราเป็นเจ้าของ เปลี่ยน SQL ได้โดย test ไม่ต้องแก้
และการทดสอบ SQL จริงเป็นหน้าที่ของ integration test ที่ชน Postgres จริง

## ผลการรัน

7 suites, 38 tests ผ่านทั้งหมด