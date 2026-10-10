
import { Clock } from '../../src/clock';
import { ConflictError, NotFoundError } from '../../src/errors';
import { PollService } from '../../src/services/pollService';

describe('PollService', () => {
  const fixedTime = new Date('2026-10-10T10:00:00.000Z');

  let clock: Clock;

let districts: {
  findAll: jest.Mock;
  findById: jest.Mock;
  close: jest.Mock;
};

  let votes: {
    countByCandidate: jest.Mock;
  };

  let candidates: {
    findByDistrict: jest.Mock;
    findByParty: jest.Mock;
    create: jest.Mock;
  };

  let service: PollService;

  beforeEach(() => {
    clock = {
      now: () => fixedTime,
    };

  districts = {
  findAll: jest.fn(),
  findById: jest.fn(),
  close: jest.fn(),
};

    votes = {
      countByCandidate: jest.fn(),
    };

    candidates = {
      findByDistrict: jest.fn(),
      findByParty: jest.fn(),
      create: jest.fn(),
    };

    service = new PollService(
      districts,
      votes,
      clock,
      candidates,
    );
  });

  // TC-01: ปิดหีบเลือกตั้งสำเร็จ
  it('closes an existing district using the fixed clock', async () => {
    districts.findById.mockResolvedValue({
      id: 'CM-1',
      province: 'เชียงใหม่',
      number: 1,
      closedAt: null,
    });

    districts.close.mockResolvedValue(true);

    const result = await service.close('CM-1');

    expect(result).toEqual({
      districtId: 'CM-1',
      closedAt: fixedTime,
    });

    expect(districts.close).toHaveBeenCalledWith(
      'CM-1',
      fixedTime,
    );
  });

  // TC-02: ไม่พบเขตเลือกตั้ง
  it('throws NotFoundError when district does not exist', async () => {
    districts.findById.mockResolvedValue(null);

    await expect(
      service.close('UNKNOWN'),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(districts.close).not.toHaveBeenCalled();
  });

  // TC-03: เขตเลือกตั้งถูกปิดหีบแล้ว
  it('throws ConflictError when the district is already closed', async () => {
    districts.findById.mockResolvedValue({
      id: 'CM-1',
      province: 'เชียงใหม่',
      number: 1,
      closedAt: fixedTime,
    });

    await expect(
      service.close('CM-1'),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(districts.close).not.toHaveBeenCalled();
  });

  // TC-04: ป้องกันการปิดหีบพร้อมกัน
  it('rejects a concurrent close when repository reports it was already closed', async () => {
    districts.findById.mockResolvedValue({
      id: 'CM-1',
      province: 'เชียงใหม่',
      number: 1,
      closedAt: null,
    });

    districts.close.mockResolvedValue(false);

    await expect(
      service.close('CM-1'),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  // TC-05: ก่อนปิดหีบต้องไม่แสดงคะแนน
  it('hides vote counts before the district poll is closed', async () => {
    districts.findById.mockResolvedValue({
      id: 'CM-1',
      province: 'เชียงใหม่',
      number: 1,
      closedAt: null,
    });

    candidates.findByDistrict.mockResolvedValue([
      {
        id: 10,
        districtId: 'CM-1',
        number: 1,
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        partyName: 'Party A',
      },
    ]);

    const result = await service.resultsFor('CM-1');

    expect(result.closed).toBe(false);

    expect(result.candidates[0]).not.toHaveProperty('votes');

    expect(votes.countByCandidate).not.toHaveBeenCalled();
  });

  // TC-06: หลังปิดหีบแสดงคะแนน รวมถึงผู้สมัครที่ได้ 0 คะแนน
  it('shows vote counts after the district poll is closed', async () => {
    districts.findById.mockResolvedValue({
      id: 'CM-1',
      province: 'เชียงใหม่',
      number: 1,
      closedAt: fixedTime,
    });

    candidates.findByDistrict.mockResolvedValue([
      {
        id: 10,
        districtId: 'CM-1',
        number: 1,
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        partyName: 'Party A',
      },
      {
        id: 20,
        districtId: 'CM-1',
        number: 2,
        firstName: 'สมหญิง',
        lastName: 'รักดี',
        partyName: 'Party B',
      },
    ]);

    votes.countByCandidate
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    const result = await service.resultsFor('CM-1');

    expect(result.closed).toBe(true);
    expect(result.closedAt).toEqual(fixedTime);

    expect(result.candidates).toEqual([
      {
        number: 1,
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        partyName: 'Party A',
        votes: 3,
      },
      {
        number: 2,
        firstName: 'สมหญิง',
        lastName: 'รักดี',
        partyName: 'Party B',
        votes: 0,
      },
    ]);
  });

  // TC-07: ขอผลคะแนนจากเขตเลือกตั้งที่ไม่มีอยู่จริง
  it('throws NotFoundError when requesting results for an unknown district', async () => {
    districts.findById.mockResolvedValue(null);

    await expect(
      service.resultsFor('UNKNOWN'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
