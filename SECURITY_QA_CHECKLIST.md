# HireMe — security QA checklist

Run after deploying Firestore rules (`firebase deploy --only firestore:rules`) and before inviting real users.

## Environment

- [ ] `CALENDAR_TOKEN_ENCRYPTION_KEY` set on Vercel for calendar connect flows.
- [ ] `ADMIN_EMAILS` or `ADMIN_EMAIL` set; optional `NEXT_PUBLIC_ADMIN_EMAILS` matches if using client admin UI.
- [ ] `CRON_SECRET` set for cron routes.
- [ ] `FIREBASE_PRIVATE_KEY` newline form correct in Vercel.
- [ ] `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` match production domain.

## Firestore rules (manual / emulator)

- [ ] Unauthenticated: cannot read `users/*`, `jobs/*`, `messageThreads`, `messages`, `companyRatings` (ratings require auth).
- [ ] Unauthenticated: can **get** single `publicCandidateProfiles/{id}` (endorse preview); cannot **list** the collection.
- [ ] Employer A: cannot read employer B full `users` docs (except JOB_SEEKER rule removed — use API / public projection).
- [ ] JOB_SEEKER: can read `EMPLOYER` / `RECRUITER` user docs for messaging context.
- [ ] JOB_SEEKER: cannot read another JOB_SEEKER `users` doc.
- [ ] `messageThreads` update: cannot change `participantIds` / `companyId` / immutable job fields; can update `lastMessage*`, `acceptedBy`, `archivedBy`, `mutedBy`, `jobId`/`jobContext` within whitelist.
- [ ] `messages` update: only `read` + `updatedAt` (mark read).
- [ ] `endorsements` create: requires `endorserUserId == auth.uid` and `userId != auth.uid`.
- [ ] Sensitive collections (`candidateOffers`, `talentPools`, `calendarIntegrations`, …): client read/write denied.

## Public projections

- [ ] After saving seeker profile, `publicCandidateProfiles/{uid}` exists (POST `/api/auth/sync-public-candidate-profile` or admin bootstrap).
- [ ] Admin backfill (once): `POST /api/admin/bootstrap-public-candidate-profiles` with admin Bearer token; paginate with `nextStartAfter` if needed.
- [ ] After job create / edit + sync route, `publicJobs/{jobId}` exists for ACTIVE/PUBLIC jobs.

## API (curl or REST client)

- [ ] `GET /api/employer/candidate-profile/:id` without token → 401.
- [ ] Same route as JOB_SEEKER → 403.
- [ ] Same route as employer with valid candidate id → 200 JSON `profile` without `email` / `phone`.
- [ ] `POST /api/job/:id/sync-public` without job access → 403.
- [ ] `POST /api/auth/verify-users` as non-admin → 403.
- [ ] `GET /api/debug/match-trace` in production → 403 (NODE_ENV not development).

## Messaging

- [ ] Participant cannot read arbitrary `threadId` messages.
- [ ] Employer thread list shows candidate names from `publicCandidateProfiles` when present.

## Offers / feedback / debriefs

- [ ] Candidate not in pipeline/match cannot manipulate offers (existing server checks).

## Calendar

- [ ] Connect flow fails fast if encryption key missing in production-like env.
- [ ] No OAuth tokens in browser network JSON responses for calendar routes.

## Rate limiting

- [ ] Rapid `POST /api/job/parse-preview` → 429 after threshold (per-instance).

## Headers

- [ ] Response includes `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`; production includes `Strict-Transport-Security`.

## Storage (Firebase Storage)

- [ ] Deploy storage rules: `firebase deploy --only storage`.
- [ ] Candidate can upload own resume (`POST /api/upload/resume`) and metadata is saved on `users/{uid}` (`resumeStoragePath`, `resumeMimeType`, `resumeSizeBytes`, `resumeUploadedAt`).
- [ ] Candidate can upload own transcript (`POST /api/upload/transcript`) and metadata is saved (`transcriptStoragePath`, `transcriptMimeType`, `transcriptSizeBytes`, `transcriptUploadedAt`).
- [ ] Candidate can upload own intro video via signed upload flow (`POST /api/upload/video` prepare + complete) and metadata is saved (`introVideoStoragePath`, `introVideoMimeType`, `introVideoSizeBytes`, `introVideoUploadedAt`).
- [ ] Candidate can upload own profile image (`POST /api/upload/profile-image`) and `profileImageUrl` remains the only public media URL.
- [ ] Candidate cannot upload unsupported file MIME types (resume non-PDF, transcript non-PDF/image, video non-mp4/webm/quicktime, image non-jpeg/png/webp).
- [ ] Candidate cannot upload oversized files (resume >5MB, transcript >10MB, video >100MB, profile image >5MB).
- [ ] Candidate cannot upload for another uid (server derives uid from verified Firebase ID token).
- [ ] Direct Storage read for private files (`resumes/*`, `transcripts/*`, `videos/*`) is denied for non-owner.
- [ ] Profile images under `profile-images/*` are readable as intended; writes remain owner-only.
- [ ] Recruiter/employer can access candidate private file only via `GET /api/employer/candidate-file/{candidateId}?type=...` with valid relationship context.
- [ ] Recruiter/employer cannot access unrelated candidate files (403).
- [ ] Signed recruiter URLs expire and stop working after TTL.
- [ ] No private file storage path appears in public search/message surfaces.

## Legal / privacy (product, not legal advice)

- [ ] Terms, privacy, cookie pages linked from signup/footer.
- [ ] Calendar integration disclosure where OAuth is offered.

## Regression smoke

- [ ] Seeker signup + profile save → search still lists candidate (after sync / bootstrap).
- [ ] Employer candidate profile page loads (API path).
- [ ] Messages send/receive; archive/mute still works.
