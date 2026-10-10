# Bonus — Original Backend vs V&V

ต้นฉบับที่เจ้าของงานระบุ:
https://github.com/thanapon1406/953713-software-backend-development-final-project.git

| Branch | Commit / บทบาท |
|---|---|
| backend/original | 32d103e27ebb0526bbf0968d1e1987e21cb561a8 — imported main snapshot ที่ไม่มีการแก้ไฟล์ |
| backend/vv | 2ba02ad — เพิ่ม characterization 7 tests ก่อนเปลี่ยน production |
| backend/vv | e226470 — extract injectable castVote และเอกสารเปรียบเทียบ |
| backend/vv | 37ddfa2 — ระบุคำสั่ง targeted typecheck ให้ตรง compiler ที่ใช้ตรวจ |

ต้นฉบับและ workshop เป็นคนละ codebase: Backend ใช้ Prisma, constituencyId ตัวเลข,
role EC และ controller คืน 400 เมื่อ service throw; workshop ใช้ pg repositories,
districtId ข้อความ, role COMMISSIONER และ closed poll เป็น 409.
จึงไม่กล่าวอ้างว่า workshop เป็นการ refactor ตรง ๆ ของ Backend หรือใช้ status ใหม่ทับของเดิม.

## Same / Changed / Rationale

| ประเด็น | Same | Changed / เหตุผล |
|---|---|---|
| Validation | ลำดับ missing user → ไม่มีเขต → ปิดหีบ → missing candidate → ผิดเขต และข้อความไทยเดิม | ย้าย vote orchestration ออกเป็น src/services/castVote.ts เพื่อทดสอบได้โดยไม่โหลด Prisma |
| Dependencies | Production ยังใช้ users/candidates/votes repositories เดิม | VoteDeps เป็น narrow interfaces; VoteService constructor inject ได้โดยมี default dependencies รักษาผู้เรียกเดิม |
| Persistence | เรียก upsertVote(userId,candidateId), รูป response เดิม | Recording collaborator ยืนยัน call/arguments และไม่มี write เมื่อถูกปฏิเสธ |
| HTTP | controller/routes/error status เดิม | ไม่แก้ status เป็น 409 ใน bonus; นี่เป็น behavior preservation |
| Test harness | ต้นฉบับไม่มี test script/test files | Node built-in runner + TypeScript stripping; npm test ไม่ต้อง install dependencies/DB/env |
| Characterization | เริ่มจาก code จริงของต้นฉบับ | commit แรกใช้ temporary VM module seam; หลัง extract ใช้ injected function ไม่โหลด database |
| Unrelated code | schema, migrations, auth, uploads, results ไม่เปลี่ยน | จำกัด scope ให้ตรวจ diff ได้ง่าย |

## Reproduce

จาก clone repository ส่งงาน ใช้ worktree เพื่อไม่เปลี่ยนงานปัจจุบัน:

```sh
git fetch origin
git worktree add ../backend-vv-review origin/backend/vv
cd ../backend-vv-review
node --version  # Node >=24.11
npm test
```

Original + characterization: 7/7 passed; หลัง extract: 7/7 passed.
ชื่อ tests อยู่ backend/vv:test/unit/vote.test.cjs:

- castVote preserves the successful response and upserts exactly once
- castVote rejects missing user without persisting a vote
- castVote rejects missing constituency without persisting a vote
- castVote rejects closed poll without persisting a vote
- castVote rejects missing candidate without persisting a vote
- castVote rejects wrong district without persisting a vote
- castVote stops before candidate lookup when the poll is closed

Targeted strict typecheck ของ castVote.ts ผ่านด้วย TypeScript ที่ติดตั้งใน workshop:
`tsc --ignoreConfig --noEmit --strict --skipLibCheck --target es2020 --module commonjs src/services/castVote.ts`.
`--ignoreConfig` เป็น option ของ compiler ที่ใช้ audit (TypeScript 6); ไม่ใช่ script build เดิม.
ไม่ได้อ้าง full Backend production build หรือ Prisma/HTTP/S3/Supabase integration ผ่าน.

ตรวจ diff: `git diff backend/original..backend/vv -- src/services package.json test README.md`.
ต้นฉบับ branch tree ตรงกับ source snapshot; ยังต้องให้เจ้าของยืนยันหากงาน Backend ที่ส่งจริง
ใช้ commit อื่น. ที่มาของ source ถูกระบุชัด ไม่อ้างว่าเป็นโค้ดที่เขียนใหม่ทั้งหมด.
