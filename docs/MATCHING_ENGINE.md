# Job–candidate matching engine (V1)

## Architecture audit summary

- **Production data**: Firebase **Firestore** (`users`, `jobs`, …). **Prisma/Postgres** exists in the repo but is **not** used for live jobs or profiles in the app.
- **Jobs**: `jobs` collection; creation via `POST /api/job/create` (Firebase ID token).
- **Roles**: `EMPLOYER`, `RECRUITER`, `JOB_SEEKER`, `ADMIN` on `users.role`.
- **V1 storage for matches**: Firestore collection **`jobMatches`** (not Prisma), to avoid two sources of truth.

## Firestore indexes

Deploy the composite index (required for ranked matches query):

```bash
firebase deploy --only firestore:indexes
```

Source: `firestore.indexes.json` — `jobMatches`: `jobId` ASC, `overallScore` DESC.

## Collections / fields

### `jobs` (additional fields)

- `industry`, `location`, `minGpa`, `jobType`
- `normalizedTitle`, `aiSummary`, `requiredSkills`, `preferredSkills`, `seniorityLevel`, `keywords`, `embedding` (null)
- `aiProcessingSource`: `openai` | `heuristic`
- `matchStatus`: `pending` | `complete` | `failed`
- `matchLastRunAt`, `matchError`

### `jobMatches` documents

- Doc id: `{jobId}_{candidateId}`
- `jobId`, `candidateId`, `employerId`
- Scores: `overallScore`, `semanticScore` (null in V1), `skillsScore`, `titleScore`, `locationScore`, `gpaScore`, `industryScore`, `preferenceScore`
- `explanation`, `strengths`[], `gaps`[]
- `createdAt`, `updatedAt` (ISO strings)

## API routes

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/job/create` | Body `idToken` |
| GET | `/api/employer/jobs` | `Authorization: Bearer` |
| GET | `/api/job/[jobId]` | Bearer |
| GET | `/api/job/[jobId]/matches` | Bearer |
| POST | `/api/job/[jobId]/rerun-matches` | Bearer |

## UI routes

- `/employer/job/new` — create job (redirects to matches)
- `/employer/job/[id]/matches` — Top / Strong / Potential matches
- Employer job list: sparkles icon → matches

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | No | Job normalization + richer summaries when set |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | No | Default `text-embedding-3-small` for future semantic matching |

## Packages

No new npm dependencies; OpenAI is called via `fetch`.

## Prisma migration

Intentionally **not** added for `Job` / `JobMatch` — production uses Firestore only for this feature.

## Scoring & normalization (V2)

Authoritative rules and inline debug comments live in `lib/matching/scoring.ts`. Summary:

- **Weights**: skills 35%, title 20%, location 15%, GPA 10%, industry 10%, preference 10%.
- **Skills**: deduped lists; word-boundary-style detection in job processing (`lib/ai/job-processing.ts`); blob matches require length ≥3 to avoid `"r"` false positives.
- **Title**: synonym families in `lib/matching/title-roles.ts`; partial credit floor when ≥1 signal hits.
- **GPA**: no min → 100; min set + candidate GPA missing → **50**; below min → 0; meets → 100.
- **Preference**: no default 100; match → 82, mismatch → 32, missing data → 45–50.
- **Dev logging**: `buildScoreDebugLines` + `console.info` per candidate when `NODE_ENV=development` (`lib/matching/job-matching.ts`).

### Backfill / cleanup

- **Job documents**: Old `requiredSkills` / `keywords` are cleaned at **read time** in `jobDocToScoringPayload` (dedupe + keyword rules). Optionally re-save jobs via **Post job** flow or a one-off Admin script to persist cleaner arrays.
- **JobMatch documents**: Re-run matching so stored `explanation` / `strengths` / scores refresh: for each job call `POST /api/job/[jobId]/rerun-matches` (authenticated employer) or trigger match from the UI **Rerun matches** button.
