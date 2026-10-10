import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware';
import { TokenService } from '../auth/tokenService';
import { NotFoundError } from '../errors';
import { CandidateRepository } from '../repositories/candidateRepository';
import { DistrictRepository } from '../repositories/districtRepository';
import { PartyRepository } from '../repositories/partyRepository';
import { ElectionAdminService } from '../services/electionAdminService';
import { PollService } from '../services/pollService';
interface ElectionRouteDeps {
  admin: ElectionAdminService;
  districts: DistrictRepository;
  parties: PartyRepository;
  candidates: CandidateRepository;
  tokens: TokenService;
  poll?: PollService;
}

export function electionRoutes({
  admin,
  districts,
  parties,
  candidates,
  tokens,
  poll,
}: ElectionRouteDeps): Router {
  const router = Router();
  const commissionerOnly = [authenticate(tokens), requireRole('COMMISSIONER')];


  router.get('/districts', async (_req, res) => {
    res.json(await districts.findAll());
  });

  router.get('/parties', async (_req, res) => {
    res.json(await parties.findAll());
  });

  router.get('/parties/:id', async (req, res) => {
    const party = await parties.findById(Number(req.params.id));
    if (!party) throw new NotFoundError('party not found');
    res.json({ ...party, candidates: await candidates.findByParty(party.id) });
  });

  router.post('/parties', ...commissionerOnly, async (req, res) => {
    res.status(201).json(await admin.createParty(req.body ?? {}));
  });

  router.post('/districts/:id/candidates', ...commissionerOnly, async (req, res) => {
    res.status(201).json(await admin.addCandidate(req.params.id as string, req.body ?? {}));
  });


  // Commissioner closes a district's poll.
  router.post('/districts/:id/close', ...commissionerOnly, async (req, res) => {
    if (!poll) {
      res.status(500).json({ error: 'poll service unavailable' });
      return;
    }

    const result = await poll.close(req.params.id as string);
    res.status(200).json(result);
  });

  // Public results: hide votes before closing, show votes after closing.
  router.get('/districts/:id/results', async (req, res) => {
    if (!poll) {
      res.status(500).json({ error: 'poll service unavailable' });
      return;
    }

    res.json(await poll.resultsFor(req.params.id as string));
  });

  return router;
}