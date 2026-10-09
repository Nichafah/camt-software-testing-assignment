import { hashPassword, verifyPassword } from '../../src/auth/passwords';
import { TokenService } from '../../src/auth/tokenService';
import { District, User } from '../../src/domain/types';
import { ConflictError, UnauthorizedError, ValidationError } from '../../src/errors';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { NewUser } from '../../src/repositories/userRepository';
import { AccountService, Registration } from '../../src/services/accountService';
import { InMemoryUserRepository } from '../support/inMemoryRepositories';

const chiangMai1: District = { id: 'CM-1', province: 'เชียงใหม่', number: 1 };

function aRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    nationalId: '1509900000017',
    password: 'voter1234',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    address: '1 ถนนนิมมานเหมินท์ เชียงใหม่',
    districtId: 'CM-1',
    ...overrides,
  };
}

function aUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    nationalId: '1509900000017',
    passwordHash: hashPassword('voter1234'),
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    address: '1 ถนนนิมมานเหมินท์ เชียงใหม่',
    districtId: 'CM-1',
    role: 'VOTER',
    ...overrides,
  };
}

// Dummy: ต้องส่งให้ครบ แต่ถ้าถูกเรียกให้พัง เพื่อรู้ทันทีว่าโค้ดไปใช้มันโดยไม่ตั้งใจ
const dummyTokens: TokenService = {
  issue: () => {
    throw new Error('dummy should not be used');
  },
  verify: () => {
    throw new Error('dummy should not be used');
  },
};

const dummyDistricts: DistrictRepository = {
  findAll: () => {
    throw new Error('dummy should not be used');
  },
  findById: () => {
    throw new Error('dummy should not be used');
  },
};

// Stub: ป้อนผลลัพธ์ของ findById ที่เรากำหนดไว้ (input ทางอ้อมของ service)
function stubDistricts(found: District | null): DistrictRepository {
  return { findAll: jest.fn(), findById: jest.fn().mockResolvedValue(found) };
}

// jest.fn() ที่ create คืน user ให้ตามที่รับ ใช้เป็น spy ดูว่าถูกเรียกด้วยอะไร
function spyUsers() {
  return {
    findById: jest.fn(),
    findByNationalId: jest.fn().mockResolvedValue(null),
    create: jest.fn(async (user: NewUser) => ({ id: 1, role: 'VOTER' as const, ...user })),
    updateRole: jest.fn(),
  };
}

describe('AccountService', () => {
  describe('register', () => {
    it('registers a voter in an existing district (stub DistrictRepository, dummy TokenService)', async () => {
      // Arrange — districts เป็น stub คืนเขต CM-1, tokens เป็น dummy เพราะ register ไม่ต้องออก token
      const service = new AccountService(spyUsers(), stubDistricts(chiangMai1), dummyTokens);

      // Act
      const registered = await service.register(aRegistration());

      // Assert
      expect(registered).toMatchObject({ nationalId: '1509900000017', districtId: 'CM-1', role: 'VOTER' });
    });

    it('rejects an unknown district', async () => {
      // Arrange — stub คืน null เพื่อจำลองว่าไม่มีเขตนี้
      const service = new AccountService(spyUsers(), stubDistricts(null), dummyTokens);

      // Act
      const attempt = service.register(aRegistration({ districtId: 'XX-9' }));

      // Assert
      await expect(attempt).rejects.toThrow(ValidationError);
    });

    it('stores a hash, never the plain-text password (spy on UserRepository.create)', async () => {
      // Arrange — users.create เป็น spy บันทึกสิ่งที่ถูกส่งมาให้ตรวจทีหลัง
      const users = spyUsers();
      const service = new AccountService(users, stubDistricts(chiangMai1), dummyTokens);

      // Act
      await service.register(aRegistration({ password: 'voter1234' }));

      // Assert
      const [savedUser] = users.create.mock.calls[0];
      expect(savedUser.passwordHash).not.toContain('voter1234');
      expect(verifyPassword('voter1234', savedUser.passwordHash)).toBe(true);
    });

    it('rejects a national id that is already registered (fake UserRepository)', async () => {
      // Arrange — fake เก็บข้อมูลจริงใน memory ใส่ผู้ใช้เดิมไว้ก่อน
      const users = new InMemoryUserRepository();
      await users.create({
        nationalId: '1509900000017',
        passwordHash: 'existing-hash',
        firstName: 'คนเดิม',
        lastName: 'ลงไว้แล้ว',
        address: 'เชียงใหม่',
        districtId: 'CM-1',
      });
      const service = new AccountService(users, stubDistricts(chiangMai1), dummyTokens);

      // Act
      const attempt = service.register(aRegistration({ nationalId: '1509900000017' }));

      // Assert
      await expect(attempt).rejects.toThrow(ConflictError);
    });

    it('does not save anything when the national id is invalid (mock: create not called)', async () => {
      // Arrange — เลขบัตร checksum ผิด (...018) ตั้ง expectation ว่า create ต้องไม่ถูกเรียก
      const users = spyUsers();
      const service = new AccountService(users, stubDistricts(chiangMai1), dummyTokens);

      // Act
      const attempt = service.register(aRegistration({ nationalId: '1509900000018' }));

      // Assert
      await expect(attempt).rejects.toThrow(ValidationError);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a token for the user (mock TokenService.issue called with the principal)', async () => {
      // Arrange — users เป็น stub คืนผู้ใช้ที่มีรหัสผ่านจริง, tokens.issue เป็น mock ที่เราตรวจการเรียก
      const user = aUser({ id: 7, role: 'VOTER', districtId: 'CM-1' });
      const users = spyUsers();
      users.findByNationalId.mockResolvedValue(user);
      const tokens = { issue: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };
      const service = new AccountService(users, dummyDistricts, tokens);

      // Act
      const token = await service.login(user.nationalId, 'voter1234');

      // Assert
      expect(token).toBe('signed-token');
      expect(tokens.issue).toHaveBeenCalledWith({ userId: 7, role: 'VOTER', districtId: 'CM-1' });
    });

    it('rejects a wrong password without issuing a token', async () => {
      // Arrange — เหมือนข้างบน แต่ mock ถูกตั้งไว้ว่าห้ามถูกเรียก
      const user = aUser();
      const users = spyUsers();
      users.findByNationalId.mockResolvedValue(user);
      const tokens = { issue: jest.fn(), verify: jest.fn() };
      const service = new AccountService(users, dummyDistricts, tokens);

      // Act
      const attempt = service.login(user.nationalId, 'wrong-password');

      // Assert
      await expect(attempt).rejects.toThrow(UnauthorizedError);
      expect(tokens.issue).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('refuses to make anyone an ADMIN', async () => {
      // Arrange — updateRole เป็น spy เพื่อยืนยันว่าไม่มีการแก้ role เกิดขึ้น
      const users = spyUsers();
      const service = new AccountService(users, dummyDistricts, dummyTokens);

      // Act
      const attempt = service.changeRole(1, 'ADMIN');

      // Assert
      await expect(attempt).rejects.toThrow(ValidationError);
      expect(users.updateRole).not.toHaveBeenCalled();
    });
  });
});