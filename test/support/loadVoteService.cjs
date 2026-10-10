// Temporary module seam for characterization before dependency injection.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
exports.loadVoteService = (deps) => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/services/vote.service.ts'), 'utf8')
    .replace(/^import .*;\r?$/gm, '')
    .replace('export class VoteService', 'class VoteService');
  const VoteService = vm.runInNewContext(stripTypeScriptTypes(source) + '\nVoteService;', {
    userRepo: deps.users, candidateRepo: deps.candidates, voteRepo: deps.votes, constituencyRepo: {},
  });
  return new VoteService();
};
