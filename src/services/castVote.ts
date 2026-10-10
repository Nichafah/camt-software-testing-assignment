// Sprout Method: voting orchestration depends on narrow interfaces, not Prisma.
export interface VoteDeps {
  users: { findById(id: number): Promise<{
    constituencyId: number | null;
    constituency: { isClosed: boolean; province: string; districtNumber: number };
  } | null> };
  candidates: { findById(id: number): Promise<{ constituencyId: number } | null> };
  votes: { upsertVote(userId: number, candidateId: number): Promise<{
    id: number;
    timestamp: Date;
    candidate: {
      id: number; candidateNumber: number;
      user: { firstName: string; lastName: string };
      party: { id: number; name: string };
    };
  }> };
}

export async function castVote(deps: VoteDeps, userId: number, candidateId: number) {
    const user = await deps.users.findById(userId);

    if (!user) {
      throw new Error(`ไม่พบผู้ใช้ ID: ${userId}`);
    }

    if (!user.constituencyId) {
      throw new Error(`ผู้ใช้ยังไม่ได้ลงทะเบียนในเขตเลือกตั้ง`);
    }

    if (user.constituency.isClosed) {
      throw new Error(
        `การลงคะแนนในเขต ${user.constituency.province} เขตที่ ${user.constituency.districtNumber} ปิดแล้ว`,
      );
    }

    const candidate = await deps.candidates.findById(candidateId);

    if (!candidate) {
      throw new Error(`ไม่พบผู้สมัคร ID: ${candidateId}`);
    }

    if (candidate.constituencyId !== user.constituencyId) {
      throw new Error(`ผู้สมัครนี้ไม่ได้อยู่ในเขตเลือกตั้งของคุณ`);
    }

    const vote = await deps.votes.upsertVote(userId, candidateId);

    return {
      message: "ลงคะแนนสำเร็จ",
      vote: {
        id: vote.id,
        timestamp: vote.timestamp,
        candidate: {
          id: vote.candidate.id,
          candidateNumber: vote.candidate.candidateNumber,
          firstName: vote.candidate.user.firstName,
          lastName: vote.candidate.user.lastName,
          party: {
            id: vote.candidate.party.id,
            name: vote.candidate.party.name,
          },
        },
      },
    };
}
