import { ConflictError, ValidationError } from '../../src/errors';
import { ElectionAdminService } from '../../src/services/electionAdminService';
import {
  InMemoryCandidateRepository,
  InMemoryDistrictRepository,
  InMemoryPartyRepository,
} from '../support/inMemoryRepositories';

describe('ElectionAdminService.addCandidate', () => {
  let admin: ElectionAdminService;
  let doiSuthep: number;
  let maePing: number;

  beforeEach(async () => {
    const parties = new InMemoryPartyRepository();
    const districts = new InMemoryDistrictRepository([
 { id: 'CM-1', province: 'เชียงใหม่', number: 1, closedAt: null },
 { id: 'CM-2', province: 'เชียงใหม่', number: 2, closedAt: null },
    ]);
    admin = new ElectionAdminService(parties, new InMemoryCandidateRepository(parties), districts);
    doiSuthep = (await admin.createParty({ name: 'พรรคดอยสุเทพ', policy: 'รถแดงไฟฟ้า' })).id;
    maePing = (await admin.createParty({ name: 'พรรคแม่ปิง', policy: 'แก้ฝุ่น' })).id;
  });

  const candidate = (partyId: number, number: number) => ({ partyId, number, firstName: 'ผู้สมัคร', lastName: 'ทดสอบ' });

  it('adds a candidate to a district', async () => {
    const added = await admin.addCandidate('CM-1', candidate(doiSuthep, 1));

    expect(added).toMatchObject({ districtId: 'CM-1', number: 1, partyName: 'พรรคดอยสุเทพ' });
  });

  it('rejects a candidate number already used in the district', async () => {
    await admin.addCandidate('CM-1', candidate(doiSuthep, 1));

    const result = admin.addCandidate('CM-1', candidate(maePing, 1));

    await expect(result).rejects.toThrow(new ConflictError('candidate number already used in this district'));
  });

  it('rejects a second candidate from the same party in the district', async () => {
    await admin.addCandidate('CM-1', candidate(doiSuthep, 1));

    const result = admin.addCandidate('CM-1', candidate(doiSuthep, 2));

    await expect(result).rejects.toThrow(new ConflictError('party already has a candidate in this district'));
  });

  it('allows the same number in a different district', async () => {
    await admin.addCandidate('CM-1', candidate(doiSuthep, 1));

    const added = await admin.addCandidate('CM-2', candidate(maePing, 1));

    expect(added).toMatchObject({ districtId: 'CM-2', number: 1 });
  });

  it('rejects an unknown party', async () => {
    const result = admin.addCandidate('CM-1', candidate(999, 1));

    await expect(result).rejects.toThrow(new ValidationError('unknown party'));
  });
});
