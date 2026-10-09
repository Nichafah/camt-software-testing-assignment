import { hashPassword, verifyPassword } from '../../src/auth/passwords';

describe('hashPassword', () => {
  it('does not store the password in plain text', () => {
    const password = 'voter1234';

    const stored = hashPassword(password);

    expect(stored).not.toContain(password);
  });

  it('produces a different hash each time for the same password (salt)', () => {
    const password = 'voter1234';
    const firstHash = hashPassword(password);

    const secondHash = hashPassword(password);

    expect(secondHash).not.toBe(firstHash);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', () => {
    const stored = hashPassword('voter1234');

    const matches = verifyPassword('voter1234', stored);

    expect(matches).toBe(true);
  });

  it('returns false for a wrong password', () => {
    const stored = hashPassword('voter1234');

    const matches = verifyPassword('voter12345', stored);

    expect(matches).toBe(false);
  });

  it.each(['garbage', '', 'scrypt$only-salt', 'bcrypt$salt$hash'])(
    'returns false without throwing for a malformed stored hash "%s"',
    (stored) => {
      const matches = verifyPassword('voter1234', stored);

      expect(matches).toBe(false);
    },
  );
});