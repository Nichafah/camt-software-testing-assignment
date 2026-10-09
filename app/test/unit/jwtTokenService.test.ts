import { JwtTokenService, Principal } from '../../src/auth/tokenService';

const voter: Principal = { userId: 7, role: 'VOTER', districtId: 'CM-1' };

describe('JwtTokenService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('verifies a token it issued and returns the same principal', () => {
    const service = new JwtTokenService('test-secret');
    const token = service.issue(voter);

    const principal = service.verify(token);

    expect(principal).toEqual(voter);
  });

  it('rejects a token signed with another secret', () => {
    const token = new JwtTokenService('secret-a').issue(voter);
    const verifier = new JwtTokenService('secret-b');

    const principal = verifier.verify(token);

    expect(principal).toBeNull();
  });

  it('rejects a token after it expires (jest.useFakeTimers + jest.setSystemTime)', () => {
    // Arrange — ตรึงเวลาไว้ที่ 09:00 ออก token ที่หมดอายุใน 60 วินาที
    jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00+07:00') });
    const service = new JwtTokenService('test-secret', 60);
    const token = service.issue(voter);
    jest.setSystemTime(new Date('2026-10-03T09:01:01+07:00')); // เลย 60 วินาทีมา 1 วินาที

    // Act
    const principal = service.verify(token);

    // Assert
    expect(principal).toBeNull();
  });

  it('still accepts the token just before it expires', () => {
    jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00+07:00') });
    const service = new JwtTokenService('test-secret', 60);
    const token = service.issue(voter);
    jest.setSystemTime(new Date('2026-10-03T09:00:59+07:00')); // เหลืออีก 1 วินาที

    const principal = service.verify(token);

    expect(principal).toEqual(voter);
  });
});