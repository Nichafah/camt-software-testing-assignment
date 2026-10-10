/** Sprout Method: a pure decision, independent of HTTP and PostgreSQL. */
export function whyBallotIsClosed(input: {
  now: Date;
  electionOpensAt: Date | null;
  districtClosedAt: Date | null;
}): string | null {
  if (input.electionOpensAt === null || input.now < input.electionOpensAt) return 'election is not open';
  if (input.districtClosedAt !== null) return 'poll is closed';
  return null;
}
