import { faker } from '@faker-js/faker';

// สูตรเดียวกับ isValidThaiNationalId: คูณ 12 หลักแรกด้วยน้ำหนัก 13 ลงไปถึง 2 แล้วรวมกัน
export function checksumDigit(first12: string): number {
  const sum = [...first12].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return (11 - (sum % 11)) % 10;
}

export function withChecksum(first12: string): string {
  return first12 + checksumDigit(first12);
}

export function aValidNationalId(): string {
  return withChecksum(faker.string.numeric({ length: 12, allowLeadingZeros: false }));
}