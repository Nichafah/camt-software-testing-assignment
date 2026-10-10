import { faker, fakerTH } from '@faker-js/faker';

// ทุก test เริ่มด้วย seed เดิม ถ้า test แดงเพราะข้อมูลสุ่ม รันซ้ำแล้วได้ข้อมูลชุดเดิมเสมอ
const SEED = 20261003;

beforeEach(() => {
  faker.seed(SEED);
  fakerTH.seed(SEED);
});