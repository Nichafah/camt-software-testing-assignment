import { JwtTokenService, Principal } from '../../src/auth/tokenService';

const voter: Principal = { userId: 42, role: 'VOTER', districtId: 'CM-1' };

describe('JwtTokenService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('verifies a token it issued and returns the same principal', () => {
    const tokens = new JwtTokenService('secret');
    const token = tokens.issue(voter);

    const principal = tokens.verify(token);

    expect(principal).toEqual(voter);
  });

  it('rejects a token signed with another secret', () => {
    const token = new JwtTokenService('someone-else').issue(voter);

    const principal = new JwtTokenService('secret').verify(token);

    expect(principal).toBeNull();
  });

  it('rejects a token after it expires', () => {
    jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00+07:00') });
    const tokens = new JwtTokenService('secret', 60);
    const token = tokens.issue(voter);

    jest.setSystemTime(new Date('2026-10-03T09:01:01+07:00'));
    const principal = tokens.verify(token);

    expect(principal).toBeNull();
  });

  it('still accepts the token just before it expires', () => {
    jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00+07:00') });
    const tokens = new JwtTokenService('secret', 60);
    const token = tokens.issue(voter);

    jest.setSystemTime(new Date('2026-10-03T09:00:59+07:00'));

    expect(tokens.verify(token)).toEqual(voter);
  });
});
