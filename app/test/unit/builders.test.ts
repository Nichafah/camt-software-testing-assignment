import { faker, fakerTH } from '@faker-js/faker';
import { isValidThaiNationalId } from '../../src/domain/thaiNationalId';
import { aCandidate, aCommissioner, aVoter, anAdmin } from '../support/builders';

describe('test data builders', () => {
  describe('aVoter', () => {
    it('builds a voter in the district it is told to', () => {
      const builder = aVoter().inDistrict('CM-2');

      const voter = builder.build();

      expect(voter).toMatchObject({ role: 'VOTER', districtId: 'CM-2' });
    });

    it('uses the national id it is given instead of a generated one', () => {
      const builder = aVoter().withNationalId('1100000000016');

      const voter = builder.build();

      expect(voter.nationalId).toBe('1100000000016');
    });

    it('always generates a national id with a valid checksum', () => {
      const ids = Array.from({ length: 50 }, () => aVoter().build().nationalId);

      const invalid = ids.filter((id) => !isValidThaiNationalId(id));

      expect(invalid).toEqual([]);
    });

    it('generates the same data again when faker is re-seeded', () => {
      faker.seed(1);
      fakerTH.seed(1);
      const first = aVoter().build();
      faker.seed(1);
      fakerTH.seed(1);

      const second = aVoter().build();

      expect(second).toEqual(first);
    });
  });

  describe('other roles', () => {
    it('builds a commissioner', () => {
      const user = aCommissioner().build();

      expect(user.role).toBe('COMMISSIONER');
    });

    it('builds an admin', () => {
      const user = anAdmin().build();

      expect(user.role).toBe('ADMIN');
    });
  });

  describe('aCandidate', () => {
    it('refuses to build a candidate without a party', () => {
      const builder = aCandidate().inDistrict('CM-1');

      const build = () => builder.build();

      expect(build).toThrow('forParty');
    });
  });
});