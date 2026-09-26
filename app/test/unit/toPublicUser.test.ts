import { toPublicUser } from '../../src/services/accountService';

describe('toPublicUser', () => {
  it('drops the password hash and keeps everything else', () => {
    const user = {
      id: 7,
      nationalId: '1509900000017',
      passwordHash: 'scrypt$salt$hash',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      address: 'CAMT',
      districtId: 'CM-1',
      role: 'VOTER' as const,
    };

    const publicUser = toPublicUser(user);

    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(publicUser).toEqual({
      id: 7,
      nationalId: '1509900000017',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      address: 'CAMT',
      districtId: 'CM-1',
      role: 'VOTER',
    });
  });
});
