import { whyBallotIsClosed } from '../../src/domain/ballotRules';

const now = new Date('2030-01-01T00:00:00Z');
describe('whyBallotIsClosed', () => {
  it.each([
    [null, null, 'election is not open'],
    [new Date(now.getTime() + 1), null, 'election is not open'],
    [now, null, null],
    [new Date(now.getTime() - 1), null, null],
    [now, now, 'poll is closed'],
    [now, new Date(now.getTime() - 1), 'poll is closed'],
    [null, now, 'election is not open'],
  ])('opensAt=%s, closedAt=%s returns %s', (electionOpensAt, districtClosedAt, expected) => {
    expect(whyBallotIsClosed({ now, electionOpensAt, districtClosedAt })).toBe(expected);
  });
});
