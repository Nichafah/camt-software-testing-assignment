// Constructor seam: this unit imports no Prisma, env, HTTP server, or storage.
const { castVote } = require('../../src/services/castVote.ts');
exports.loadVoteService = (deps) => ({ castVote: (userId, candidateId) => castVote(deps, userId, candidateId) });
