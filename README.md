# Backend course code — V&V comparison branch

Branch `backend/original` preserves commit `32d103e27ebb0526bbf0968d1e1987e21cb561a8`
from https://github.com/thanapon1406/953713-software-backend-development-final-project.git,
the source identified by the assignment owner. Confirm that this is the exact submitted
Backend snapshot if the course submission used another commit. `backend/vv` contains
incremental characterization and refactoring commits based on that snapshot.

## Run voting unit tests

Use Node.js 24.11 or later. These tests use Node's built-in test runner and TypeScript
stripping, so no dependency installation, PostgreSQL, Prisma generation, or .env is needed:

```sh
git switch backend/vv
npm test
```

`test/unit/vote.test.cjs`: seven tests cover the successful response/upsert, missing user,
missing constituency, closed poll, missing candidate, wrong district, and short-circuiting
before candidate lookup after closure. All rejected requests must perform zero writes.

## Before / after

| Aspect | Original | Improved | Reason |
|---|---|---|---|
| Vote orchestration | VoteService.castVote directly imports repositories | src/services/castVote.ts accepts narrow VoteDeps interfaces; VoteService supplies real defaults | A seam lets tests control collaborators without Prisma or environment side effects |
| Tests | No test script or test files in the imported snapshot | npm test runs seven voting unit tests | Executable regression evidence |
| Characterization | No harness | First commit uses a temporary VM/module seam on original service; next commit uses injection | Prove current behavior before refactoring |
| Business rules | Checks missing user/district, closure, candidate and district membership | Same order and exact Thai messages | Preserve legacy contracts |
| Persistence | upsertVote(userId, candidateId) | Same call and response fields | Retain one-vote upsert behavior; unit tests verify invocation, not database uniqueness |
| HTTP | Original controller returns success 200 and catches service errors as 400 | Controller unchanged | This bonus refactor does not adopt the workshop app's 409 response contract |
| Schema / unrelated features | Prisma schema, migrations, auth, uploads, results | Unchanged | Keep comparison focused and reviewable |

## Verification (2026-10-10)

Original service with characterization harness: 7/7 passed before refactoring.
Injected voting unit: 7/7 passed after refactoring.
Targeted strict TypeScript check of src/services/castVote.ts passed using the workshop's
installed compiler (tsc --noEmit --strict --skipLibCheck --target es2020 --module commonjs).
A full original Backend production build, Prisma integration, HTTP tests, S3/Supabase,
and concurrent close/vote behavior have not been verified by these unit tests.

Theory: characterize observed behavior first; inject dependencies at interfaces owned by
this application; use stubs to supply indirect input and a recording collaborator to
observe writes; extract the vote operation with Sprout Method; assert results and absence
of unwanted side effects. The original VM seam is retained in the first commit only.

Compare locally: `git diff backend/original..backend/vv -- src/services package.json test README.md`.
The complete workshop submission, six-element matrix and audit live on `testing-workshop`.
The imported source is attributed to the URL above; do not represent the entire imported
repository as newly authored code for this assignment.
