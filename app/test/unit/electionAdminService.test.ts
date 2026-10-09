import { ConflictError, ValidationError } from '../../src/errors';
import { CandidateInput, ElectionAdminService } from '../../src/services/electionAdminService';
import {
  InMemoryCandidateRepository,
  InMemoryDistrictRepository,
  InMemoryPartyRepository,
} from '../support/inMemoryRepositories';

function aCandidateInput(partyId: number, overrides: Partial<CandidateInput> = {}): CandidateInput {
  return { partyId, number: 1, firstName: 'อรุณ', lastName: 'ศรีเจริญ', ...overrides };
}

describe('ElectionAdminService.addCandidate', () => {
  // ใช้ fake repository ใหม่ทุก test เพื่อให้แต่ละข้อไม่ขึ้นต่อกัน
  let parties: InMemoryPartyRepository;
  let candidates: InMemoryCandidateRepository;
  let service: ElectionAdminService;

  beforeEach(() => {
    const districts = new InMemoryDistrictRepository([
      { id: 'CM-1', province: 'เชียงใหม่', number: 1 },
      { id: 'CM-2', province: 'เชียงใหม่', number: 2 },
    ]);
    parties = new InMemoryPartyRepository();
    candidates = new InMemoryCandidateRepository(parties);
    service = new ElectionAdminService(parties, candidates, districts);
  });

  async function aParty(name: string) {
    return parties.create({ name, logoUrl: null, policy: 'นโยบายตัวอย่าง' });
  }

  it('adds a candidate to a district', async () => {
    const party = await aParty('พรรคก้าวหน้า');

    const candidate = await service.addCandidate('CM-1', aCandidateInput(party.id, { number: 1 }));

    expect(candidate).toMatchObject({ districtId: 'CM-1', partyId: party.id, number: 1, partyName: 'พรรคก้าวหน้า' });
    expect(await candidates.findByDistrict('CM-1')).toHaveLength(1);
  });

  it('rejects a candidate number already used in the district', async () => {
    const partyA = await aParty('พรรค A');
    const partyB = await aParty('พรรค B');
    await candidates.create({ districtId: 'CM-1', partyId: partyA.id, number: 1, firstName: 'ก', lastName: 'ข', photoUrl: null });

    const attempt = service.addCandidate('CM-1', aCandidateInput(partyB.id, { number: 1 }));

    await expect(attempt).rejects.toThrow(ConflictError);
  });

  it('rejects a second candidate from the same party in the district', async () => {
    const party = await aParty('พรรค A');
    await candidates.create({ districtId: 'CM-1', partyId: party.id, number: 1, firstName: 'ก', lastName: 'ข', photoUrl: null });

    const attempt = service.addCandidate('CM-1', aCandidateInput(party.id, { number: 2 }));

    await expect(attempt).rejects.toThrow(ConflictError);
  });

  it('allows the same number in a different district', async () => {
    const partyA = await aParty('พรรค A');
    const partyB = await aParty('พรรค B');
    await candidates.create({ districtId: 'CM-1', partyId: partyA.id, number: 1, firstName: 'ก', lastName: 'ข', photoUrl: null });

    const candidate = await service.addCandidate('CM-2', aCandidateInput(partyB.id, { number: 1 }));

    expect(candidate).toMatchObject({ districtId: 'CM-2', number: 1 });
  });

  it('rejects an unknown party', async () => {
    const unknownPartyId = 999;

    const attempt = service.addCandidate('CM-1', aCandidateInput(unknownPartyId));

    await expect(attempt).rejects.toThrow(ValidationError);
  });
});