import { isValidThaiNationalId } from '../../src/domain/thaiNationalId';

describe('isValidThaiNationalId', () => {
  it('accepts an id whose last digit matches the checksum', () => {
    const id = '1509900000017';

    const valid = isValidThaiNationalId(id);

    expect(valid).toBe(true);
  });

  it.each(['1100000000016', '1100000000024'])('accepts another valid id %s', (id) => {
    expect(isValidThaiNationalId(id)).toBe(true);
  });

  it('rejects an id with a wrong checksum digit', () => {
    expect(isValidThaiNationalId('1509900000018')).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['12 digits', '150990000001'],
    ['14 digits', '15099000000170'],
    ['a letter', '150990000001x'],
    ['all letters', 'abcdefghijklm'],
    ['dashes', '1-5099-00000-01-7'],
  ])('rejects a malformed id (%s)', (_case, id) => {
    expect(isValidThaiNationalId(id)).toBe(false);
  });
  // Lab 08 / Lab 01 case 1: only the known checksum digit 7 is accepted.
  it.each(['0', '1', '2', '3', '4', '5', '6', '8', '9'])(
    'rejects checksum digit %s for the independently known valid prefix',
    (digit) => {
      // Arrange: this fixed prefix has checksum 7; no production algorithm in the oracle.
      const id = `150990000001${digit}`;
      // Act
      const valid = isValidThaiNationalId(id);
      // Assert
      expect(valid).toBe(false);
    },
  );

});
