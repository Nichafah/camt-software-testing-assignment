import { Clock } from '../clock';
import { ConflictError, NotFoundError } from '../errors';
import { CandidateRepository } from '../repositories/candidateRepository';
import { DistrictRepository } from '../repositories/districtRepository';
import { VoteRepository } from '../repositories/voteRepository';

export class PollService {
  constructor(
    private readonly districts: DistrictRepository,
    private readonly votes: VoteRepository,
    private readonly clock: Clock,
    private readonly candidates: CandidateRepository,
  ) {}

  async close(
    districtId: string,
  ): Promise<{ districtId: string; closedAt: Date }> {
    const district = await this.districts.findById(districtId);

    if (!district) {
      throw new NotFoundError('district not found');
    }

    if (district.closedAt !== null) {
      throw new ConflictError('poll already closed');
    }

    const closedAt = this.clock.now();
    const closed = await this.districts.close(districtId, closedAt);

    if (!closed) {
      throw new ConflictError('poll already closed');
    }

    return {
      districtId,
      closedAt,
    };
  }

  async resultsFor(districtId: string) {
    const district = await this.districts.findById(districtId);

    if (!district) {
      throw new NotFoundError('district not found');
    }

    const candidates = await this.candidates.findByDistrict(districtId);

    const publicCandidates = candidates.map((candidate) => ({
      number: candidate.number,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      partyName: candidate.partyName,
    }));

    // ก่อนปิดหีบ ไม่แสดงคะแนน
    if (district.closedAt === null) {
      return {
        district,
        closed: false,
        candidates: publicCandidates,
      };
    }

    // หลังปิดหีบ แสดงคะแนนทุกคน รวมถึงผู้สมัครที่ได้ 0 คะแนน
    const candidatesWithVotes = await Promise.all(
      candidates.map(async (candidate) => ({
        number: candidate.number,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        partyName: candidate.partyName,
        votes: await this.votes.countByCandidate(candidate.id),
      })),
    );

    return {
      district,
      closed: true,
      closedAt: district.closedAt,
      candidates: candidatesWithVotes,
    };
  }
}