import { Pool } from 'pg';
import { TokenService } from '../../../src/auth/tokenService';
import { Candidate, Party, User } from '../../../src/domain/types';
import { PgCandidateRepository } from '../../../src/repositories/candidateRepository';
import { PgPartyRepository } from '../../../src/repositories/partyRepository';
import { PgUserRepository } from '../../../src/repositories/userRepository';
import { CandidateBuilder, PartyBuilder, UserBuilder } from '../../support/builders';

// helper ที่รับ builder แล้ว insert ผ่าน repository จริง (ไม่ผ่าน API)
// และออก token ด้วย TokenService ตัวเดียวกับที่ app ใช้ จึงไม่ต้อง login ทุก test
export function createGiven(pool: Pool, tokens: TokenService) {
  const users = new PgUserRepository(pool);
  const parties = new PgPartyRepository(pool);
  const candidates = new PgCandidateRepository(pool);

  return {
    async user(builder: UserBuilder): Promise<User> {
      const { role, ...newUser } = builder.build();
      const created = await users.create(newUser);
      // repository สร้างได้แต่ผู้ใช้ role VOTER (เหมือนการสมัครจริง) จึงต้องเลื่อน role ทีหลัง
      if (role === 'VOTER') return created;
      const promoted = await users.updateRole(created.id, role);
      if (!promoted) throw new Error(`given.user(): user ${created.id} disappeared`);
      return promoted;
    },

    party(builder: PartyBuilder): Promise<Party> {
      return parties.create(builder.build());
    },

    candidate(builder: CandidateBuilder): Promise<Candidate> {
      return candidates.create(builder.build());
    },

    authHeader(user: User): { Authorization: string } {
      const token = tokens.issue({ userId: user.id, role: user.role, districtId: user.districtId });
      return { Authorization: `Bearer ${token}` };
    },
  };
}