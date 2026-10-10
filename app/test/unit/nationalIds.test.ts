import { withChecksum } from '../support/nationalIds';

describe('withChecksum', () => {
  it.each([
    ['150990000001', '1509900000017'],
    ['110000000001', '1100000000016'],
  ])('appends the checksum digit to %s to give %s', (first12, expected) => {
    const id = withChecksum(first12);

    expect(id).toBe(expected);
  });
});