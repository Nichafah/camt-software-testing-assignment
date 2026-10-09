import { Candidate, District, Party, User } from '../../src/domain/types';
import { CandidateRepository, NewCandidate } from '../../src/repositories/candidateRepository';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { NewParty, PartyRepository } from '../../src/repositories/partyRepository';
import { NewUser, UserRepository } from '../../src/repositories/userRepository';

// Fake = implementation ที่ทำงานได้จริงแต่เก็บใน memory (ไม่มี I/O)
// พฤติกรรมต้องตรงกับ Pg ตัวจริง เช่น เรียงลำดับแบบเดียวกัน

export class InMemoryDistrictRepository implements DistrictRepository {
  constructor(private readonly districts: District[] = []) {}

  async findAll(): Promise<District[]> {
    // ของจริง: ORDER BY province, number
    return [...this.districts].sort(
      (a, b) => a.province.localeCompare(b.province) || a.number - b.number,
    );
  }

  async findById(id: string): Promise<District | null> {
    return this.districts.find((d) => d.id === id) ?? null;
  }
}

export class InMemoryPartyRepository implements PartyRepository {
  private readonly parties: Party[] = [];
  private nextId = 1;

  async findAll(): Promise<Party[]> {
    // ของจริง: ORDER BY name
    return [...this.parties].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: number): Promise<Party | null> {
    return this.parties.find((p) => p.id === id) ?? null;
  }

  async findByName(name: string): Promise<Party | null> {
    return this.parties.find((p) => p.name === name) ?? null;
  }

  async create(party: NewParty): Promise<Party> {
    const created: Party = { id: this.nextId++, ...party };
    this.parties.push(created);
    return created;
  }
}

export class InMemoryCandidateRepository implements CandidateRepository {
  private readonly candidates: Candidate[] = [];
  private nextId = 1;

  // ของจริง JOIN ตาราง parties เพื่อเอา partyName จึงต้องรู้จัก party repository
  constructor(private readonly parties: PartyRepository) {}

  async findByDistrict(districtId: string): Promise<Candidate[]> {
    // ของจริง: ORDER BY number
    return this.candidates.filter((c) => c.districtId === districtId).sort((a, b) => a.number - b.number);
  }

  async findByParty(partyId: number): Promise<Candidate[]> {
    // ของจริง: ORDER BY district_id, number
    return this.candidates
      .filter((c) => c.partyId === partyId)
      .sort((a, b) => a.districtId.localeCompare(b.districtId) || a.number - b.number);
  }

  async create(candidate: NewCandidate): Promise<Candidate> {
    const party = await this.parties.findById(candidate.partyId);
    if (!party) throw new Error('foreign key violation: party does not exist'); // เลียนแบบ FK ของ DB
    const created: Candidate = { id: this.nextId++, partyName: party.name, ...candidate };
    this.candidates.push(created);
    return created;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByNationalId(nationalId: string): Promise<User | null> {
    return this.users.find((u) => u.nationalId === nationalId) ?? null;
  }

  async create(user: NewUser): Promise<User> {
    const created: User = { id: this.nextId++, role: 'VOTER', ...user };
    this.users.push(created);
    return created;
  }

  async updateRole(id: number, role: User['role']): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.role = role;
    return user;
  }
}