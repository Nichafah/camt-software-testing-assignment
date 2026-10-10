import { faker, fakerTH } from '@faker-js/faker';
import { hashPassword } from '../../src/auth/passwords';
import { Role, User } from '../../src/domain/types';
import { NewCandidate } from '../../src/repositories/candidateRepository';
import { NewParty } from '../../src/repositories/partyRepository';
import { aValidNationalId } from './nationalIds';

export const DEFAULT_PASSWORD = 'password123';

// scrypt ช้าโดยตั้งใจ จึง hash ครั้งเดียวต่อไฟล์ test แล้วใช้ซ้ำกับทุก user ที่ builder สร้าง
let cachedHash: string | undefined;
function defaultPasswordHash(): string {
  cachedHash ??= hashPassword(DEFAULT_PASSWORD);
  return cachedHash;
}

export type UserSpec = Omit<User, 'id'>;

export class UserBuilder {
  private nationalId?: string;
  private districtId?: string;

  constructor(private readonly role: Role) {}

  inDistrict(districtId: string): this {
    this.districtId = districtId;
    return this;
  }

  withNationalId(nationalId: string): this {
    this.nationalId = nationalId;
    return this;
  }

  build(): UserSpec {
    // สร้างค่าสุ่มครบทุกช่องก่อน แล้วค่อยใช้ค่าที่ test ระบุทับ
    // ลำดับการเรียก faker จึงคงที่ ไม่ว่า test จะระบุค่าไหนเองบ้าง
    const generatedNationalId = aValidNationalId();
    return {
      nationalId: this.nationalId ?? generatedNationalId,
      passwordHash: defaultPasswordHash(),
      firstName: fakerTH.person.firstName(),
      lastName: fakerTH.person.lastName(),
      address: fakerTH.location.streetAddress(),
      districtId: this.districtId ?? 'CM-1',
      role: this.role,
    };
  }
}

export class PartyBuilder {
  private name?: string;

  named(name: string): this {
    this.name = name;
    return this;
  }

  build(): NewParty {
    const generatedName = `พรรค${fakerTH.person.lastName()}${faker.string.numeric(3)}`;
    return { name: this.name ?? generatedName, logoUrl: null, policy: fakerTH.lorem.sentence() };
  }
}

export class CandidateBuilder {
  private districtId?: string;
  private partyId?: number;
  private number?: number;

  inDistrict(districtId: string): this {
    this.districtId = districtId;
    return this;
  }

  forParty(partyId: number): this {
    this.partyId = partyId;
    return this;
  }

  numbered(number: number): this {
    this.number = number;
    return this;
  }

  build(): NewCandidate {
    if (this.partyId === undefined) {
      throw new Error('aCandidate(): call .forParty(partyId) first, a candidate must belong to a party');
    }
    const generatedNumber = faker.number.int({ min: 1, max: 99 });
    return {
      districtId: this.districtId ?? 'CM-1',
      partyId: this.partyId,
      number: this.number ?? generatedNumber,
      firstName: fakerTH.person.firstName(),
      lastName: fakerTH.person.lastName(),
      photoUrl: null,
    };
  }
}

export const aVoter = () => new UserBuilder('VOTER');
export const aCommissioner = () => new UserBuilder('COMMISSIONER');
export const anAdmin = () => new UserBuilder('ADMIN');
export const aParty = () => new PartyBuilder();
export const aCandidate = () => new CandidateBuilder();