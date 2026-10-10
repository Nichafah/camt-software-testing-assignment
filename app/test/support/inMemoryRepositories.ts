
import { Candidate, District, Party, User } from '../../src/domain/types';
import { NewUser, UserRepository } from '../../src/repositories/userRepository';
import { DistrictRepository } from '../../src/repositories/districtRepository';
import { PartyRepository, NewParty } from '../../src/repositories/partyRepository';
import { CandidateRepository, NewCandidate } from '../../src/repositories/candidateRepository';
export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByNationalId(nationalId: string): Promise<User | null> {
    return this.users.find((user) => user.nationalId === nationalId) ?? null;
  }

  async create(user: NewUser): Promise<User> {
    const created: User = {
      ...user,
      id: this.nextId++,
      role: 'VOTER',
    };

    this.users.push(created);
    return created;
  }

  async updateRole(id: number, role: User['role']): Promise<User | null> {
    const user = this.users.find((item) => item.id === id);

    if (!user) return null;

    user.role = role;
    return { ...user };
  }
}

export class InMemoryDistrictRepository implements DistrictRepository {
  constructor(private readonly districts: District[] = []) {}

  async findAll(): Promise<District[]> {
    return [...this.districts].sort(
      (a, b) => a.province.localeCompare(b.province) || a.number - b.number,
    );
  }

  async findById(id: string): Promise<District | null> {
    return this.districts.find((district) => district.id === id) ?? null;
  }
}

export class InMemoryPartyRepository implements PartyRepository {
  private parties: Party[] = [];
  private nextId = 1;

  async findAll(): Promise<Party[]> {
    return [...this.parties].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: number): Promise<Party | null> {
    return this.parties.find((party) => party.id === id) ?? null;
  }

  async findByName(name: string): Promise<Party | null> {
    return this.parties.find((party) => party.name === name) ?? null;
  }

  async create(party: NewParty): Promise<Party> {
    const created: Party = {
      ...party,
      id: this.nextId++,
    };

    this.parties.push(created);
    return created;
  }
}

export class InMemoryCandidateRepository implements CandidateRepository {
  private candidates: Candidate[] = [];
  private nextId = 1;

  constructor(private readonly parties: PartyRepository) {}

  async findByDistrict(districtId: string): Promise<Candidate[]> {
    return this.candidates
      .filter((candidate) => candidate.districtId === districtId)
      .sort((a, b) => a.number - b.number);
  }

  async findByParty(partyId: number): Promise<Candidate[]> {
    return this.candidates
      .filter((candidate) => candidate.partyId === partyId)
      .sort(
        (a, b) =>
          a.districtId.localeCompare(b.districtId) || a.number - b.number,
      );
  }

  async create(candidate: NewCandidate): Promise<Candidate> {
    const party = await this.parties.findById(candidate.partyId);

    if (!party) {
      throw new Error('party must exist before creating a candidate');
    }

    const created: Candidate = {
      ...candidate,
      id: this.nextId++,
      partyName: party.name,
    };

    this.candidates.push(created);
    return created;
  }
}
