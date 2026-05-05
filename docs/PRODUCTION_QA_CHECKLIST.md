# Production QA checklist (HireMe)

Run before a major release or after security changes. Complement `SECURITY_QA_CHECKLIST.md`.

## Build

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Vercel preview build green

## Firebase / Storage

- [ ] `firebase deploy --only firestore:rules,firestore:indexes,storage`
- [ ] Storage CORS configured for production + preview origins (video upload)
- [ ] `publicCandidateProfiles` backfill if schema changed (admin bootstrap)

## Auth & abuse

- [ ] Send verification / verify code rate limits return 429 when hammered (KV or reduced in-memory in prod without KV)
- [ ] Delete account: max 5/hour per user (429)
- [ ] Cron routes reject without `CRON_SECRET` or Vercel cron header

## Uploads & employer files

- [ ] Resume / transcript / image / video upload and delete
- [ ] Video finalize rejected if object missing in Storage (no ghost metadata)
- [ ] Employer candidate-file: 403 without job/thread/pool relationship; 429 under spam
- [ ] Signed read URL expires (~10 min); no permanent private URLs in projections

## Calendar

- [ ] Connect + disconnect; tokens not returned to client
- [ ] Production requires `CALENDAR_TOKEN_ENCRYPTION_KEY`

## Monitoring

- [ ] Sentry DSN set → trigger test error in staging; event received
- [ ] `global-error` and route `error.tsx` render when forced error (staging)

## Legal links (product)

- [ ] Footer shows Privacy, Candidate terms, Cookie policy on authenticated pages
- [ ] Seeker onboarding requires terms acknowledgment before submit

## CSP

- [ ] Production sends `Content-Security-Policy-Report-Only`; no mass violations in browser console on core flows (Auth, messaging, uploads, GA)
