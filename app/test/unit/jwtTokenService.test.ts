// Lab 03 — time is a dependency too. Use jest fake timers for the expiry test.
describe('JwtTokenService', () => {
  it.todo('verifies a token it issued and returns the same principal');
  it.todo('rejects a token signed with another secret');
  it.todo('rejects a token after it expires (jest.useFakeTimers + jest.setSystemTime)');
});
