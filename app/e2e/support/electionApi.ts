// Talks to the running app over HTTP only — the e2e tests' view of the system.
import { APIRequestContext, expect } from '@playwright/test';

// Bootstrap accounts from db/changelog/changes/901-e2e-seed.sql
export const COMMISSIONER = { nationalId: '1100000000024', password: 'commission1234' };
export const ADMIN = { nationalId: '1100000000016', password: 'admin1234' };

let sequence = 0;

/** Valid, unique within a run (the e2e database is recreated on every run). */
export function uniqueNationalId(): string {
  const base =
    '9' +
    String(process.pid % 100).padStart(2, '0') +
    String(Date.now()).slice(-6) +
    String(sequence++ % 1000).padStart(3, '0');
  const sum = [...base].reduce((acc, digit, i) => acc + Number(digit) * (13 - i), 0);
  return base + ((11 - (sum % 11)) % 10);
}

export class ElectionApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(credentials: { nationalId: string; password: string }): Promise<string> {
    const res = await this.request.post('/auth/login', { data: credentials });
    expect(res.status(), await res.text()).toBe(200);
    return (await res.json()).token;
  }

  /** Registers a new voter in the district and returns their token. */
  async newVoterIn(districtId: string): Promise<string> {
    const credentials = { nationalId: uniqueNationalId(), password: 'voter1234' };
    const res = await this.request.post('/auth/register', {
      data: { ...credentials, firstName: 'ผู้มีสิทธิ', lastName: 'ทดสอบ', address: 'CAMT', districtId },
    });
    expect(res.status(), await res.text()).toBe(201);
    return this.login(credentials);
  }

  async createParty(token: string, name: string): Promise<{ id: number; name: string }> {
    const res = await this.request.post('/parties', {
      headers: auth(token),
      data: { name, policy: `นโยบายของ${name}` },
    });
    expect(res.status(), await res.text()).toBe(201);
    return res.json();
  }

  async addCandidate(token: string, districtId: string, partyId: number, number: number): Promise<{ id: number }> {
    const res = await this.request.post(`/districts/${districtId}/candidates`, {
      headers: auth(token),
      data: { partyId, number, firstName: 'ผู้สมัคร', lastName: `หมายเลข ${number}` },
    });
    expect(res.status(), await res.text()).toBe(201);
    return res.json();
  }

  async vote(token: string, candidateId: number) {
    return this.request.put('/me/vote', { headers: auth(token), data: { candidateId } });
  }

  async myCandidates(token: string) {
    return this.request.get('/me/candidates', { headers: auth(token) });
  }

  async results(districtId: string) {
    return this.request.get(`/districts/${districtId}/results`);
  }
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
