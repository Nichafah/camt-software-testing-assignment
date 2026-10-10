import { faker, fakerTH } from '@faker-js/faker';
import { aValidNationalId } from '../support/nationalIds';
import { verifyPassword } from '../../src/auth/passwords';
import { TokenService } from '../../src/auth/tokenService';
import { ConflictError, UnauthorizedError, ValidationError } from '../../src/errors';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { AccountService, Registration } from '../../src/services/accountService';
import { InMemoryUserRepository } from '../support/inMemoryRepositories';

// DUMMY: register() never touches tokens; it fails loudly if that ever changes.
const dummyTokens: TokenService = {
  issue: () => {
    throw new Error('dummy TokenService should not be used');
  },
  verify: () => {
    throw new Error('dummy TokenService should not be used');
  },
};

// STUB: feeds the indirect input "does this district exist?"
function stubDistricts(existing: boolean): DistrictRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(existing ? { id: 'CM-1', province: 'เชียงใหม่', number: 1 } : null),
    close: jest.fn(),
  };
}

const registration: Registration = {
  nationalId: '1509900000017',
  password: 'voter1234',
  firstName: ' สมชาย ',
  lastName: 'ใจดี',
  address: '239 ถ.ห้วยแก้ว',
  districtId: 'CM-1',
};

describe('AccountService', () => {
  describe('register', () => {
    it('registers a voter in an existing district', async () => {
      const accounts = new AccountService(new InMemoryUserRepository(), stubDistricts(true), dummyTokens);

      const user = await accounts.register(registration);

      expect(user).toMatchObject({ nationalId: '1509900000017', role: 'VOTER', districtId: 'CM-1' });
    });

    it('registers dynamically generated Faker voter data without exposing the password hash', async () => {
      // Arrange: seedFaker.ts fixes the seed, but fields are generated at runtime.
      const input: Registration = {
        nationalId: aValidNationalId(),
        password: faker.string.alphanumeric(12),
        firstName: fakerTH.person.firstName(),
        lastName: fakerTH.person.lastName(),
        address: fakerTH.location.streetAddress(),
        districtId: 'CM-1',
      };
      const users = new InMemoryUserRepository();
      const accounts = new AccountService(users, stubDistricts(true), dummyTokens);

      // Act
      const voter = await accounts.register(input);

      // Assert: generated fields survive registration and secrets remain private.
      expect(voter).toEqual({
        id: 1, nationalId: input.nationalId, firstName: input.firstName.trim(),
        lastName: input.lastName.trim(), address: input.address.trim(),
        districtId: 'CM-1', role: 'VOTER',
      });
      expect(voter).not.toHaveProperty('passwordHash');
      const saved = await users.findById(voter.id);
      expect(saved).not.toBeNull();
      expect(verifyPassword(input.password, saved!.passwordHash)).toBe(true);
      expect(verifyPassword(`${input.password}-wrong`, saved!.passwordHash)).toBe(false);
    });

    it('rejects an unknown district', async () => {
      const accounts = new AccountService(new InMemoryUserRepository(), stubDistricts(false), dummyTokens);

      const result = accounts.register(registration);

      await expect(result).rejects.toThrow(new ValidationError('unknown district'));
    });

    it('stores a hash, never the plain-text password, and trims names', async () => {
      const users = new InMemoryUserRepository();
      const create = jest.spyOn(users, 'create'); // SPY: records the indirect output
      const accounts = new AccountService(users, stubDistricts(true), dummyTokens);

      await accounts.register(registration);

      const saved = create.mock.calls[0][0];
      expect(saved.passwordHash).not.toContain('voter1234');
      expect(verifyPassword('voter1234', saved.passwordHash)).toBe(true);
      expect(saved.firstName).toBe('สมชาย');
    });

    it('rejects a national id that is already registered', async () => {
      const users = new InMemoryUserRepository(); // FAKE: remembers the first registration
      const accounts = new AccountService(users, stubDistricts(true), dummyTokens);
      await accounts.register(registration);

      const second = accounts.register({ ...registration, firstName: 'คนอื่น' });

      await expect(second).rejects.toThrow(ConflictError);
    });

    it('does not save anything when the national id is invalid', async () => {
      const users = new InMemoryUserRepository();
      const create = jest.spyOn(users, 'create');
      const accounts = new AccountService(users, stubDistricts(true), dummyTokens);

      await expect(accounts.register({ ...registration, nationalId: '1509900000018' })).rejects.toThrow(
        ValidationError,
      );

      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    async function accountsWithRegisteredVoter(tokens: TokenService) {
      const users = new InMemoryUserRepository();
      const accounts = new AccountService(users, stubDistricts(true), tokens);
      const voter = await accounts.register(registration);
      return { accounts, voter };
    }

    it('issues a token for the user', async () => {
      // MOCK: we set an expectation on how issue() must be called
      const tokens = { issue: jest.fn().mockReturnValue('token-123'), verify: jest.fn() };
      const { accounts, voter } = await accountsWithRegisteredVoter(tokens);

      const token = await accounts.login('1509900000017', 'voter1234');

      expect(token).toBe('token-123');
      expect(tokens.issue).toHaveBeenCalledWith({ userId: voter.id, role: 'VOTER', districtId: 'CM-1' });
    });

    it('rejects a wrong password without issuing a token', async () => {
      const tokens = { issue: jest.fn(), verify: jest.fn() };
      const { accounts } = await accountsWithRegisteredVoter(tokens);

      await expect(accounts.login('1509900000017', 'wrong-password')).rejects.toThrow(UnauthorizedError);

      expect(tokens.issue).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('refuses to make anyone an ADMIN', async () => {
      const accounts = new AccountService(new InMemoryUserRepository(), stubDistricts(true), dummyTokens);

      const result = accounts.changeRole(1, 'ADMIN');

      await expect(result).rejects.toThrow(ValidationError);
    });
  });
});
