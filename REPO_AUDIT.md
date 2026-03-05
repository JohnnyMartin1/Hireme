# HireMe – Complete Repo Audit

**Date:** 2026-02-25  
**Scope:** Bugs, runtime errors, edge cases, performance, security (OWASP-style), privacy/compliance.

---

## 1. Architecture Summary

- **Framework:** Next.js 14 (App Router). Deployment: Vercel (serverless); cron for profile reminders at 3pm EST.
- **Auth:** Firebase Auth (client) + Firebase Admin (server). No middleware protection; auth is enforced per-page and in API routes via `Authorization: Bearer <idToken>` and `adminAuth.verifyIdToken()`. Session state is client-side (Firebase persistence).
- **Data:** Firestore is the primary store for users, jobs, messages, profile views, etc. Prisma schema exists (PostgreSQL) but is only used for seed/reset scripts; production reads/writes go through Firestore (client SDK and Admin SDK).
- **Integrations:** Resend (email), Firebase Storage (uploads), optional S3 presign (lib/s3.ts; no API route found that exposes it). Google Analytics via layout Script.
- **Secrets:** Env vars for Firebase (client + admin), Resend, CRON_SECRET, ADMIN_EMAIL, S3, SMTP. No `.env.example` in scan; Firebase Admin init logs credential presence (and private key length/prefix) in all environments.

---

## 2. Findings Report

### Table of Contents

- [Critical](#critical)
- [High](#high)
- [Medium](#medium)
- [Low](#low)

---

### Critical

#### C-1: Unauthenticated email bombing via send-profile-reminder

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/auth/send-profile-reminder/route.ts` (entire POST handler) |
| **Why it's a problem** | Any client can POST `{ "email": "victim@example.com", "firstName": "..." }` and send a “Complete Your Profile” email to any address. Enables harassment and Resend abuse; no auth or rate limit. |
| **Reproduce** | `curl -X POST https://<your-app>/api/auth/send-profile-reminder -H "Content-Type: application/json" -d '{"email":"victim@example.com"}'` |
| **Fix** | Allow only from cron (same as profile-reminders cron): require `Authorization: Bearer <CRON_SECRET>` or `x-vercel-cron: true`. Do not accept arbitrary caller. |

```ts
// app/api/auth/send-profile-reminder/route.ts — add at top of POST
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;
const isCron = request.headers.get('x-vercel-cron') === 'true' || (cronSecret && authHeader === `Bearer ${cronSecret}`);
if (!isCron) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

| **Tests** | Integration test: POST without cron secret returns 401; with valid CRON_SECRET returns 200 when email is sent. |

---

#### C-2: auth/verify-users exposes all Firebase Auth UIDs

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/auth/verify-users/route.ts` (lines 9–19) |
| **Why it's a problem** | Unauthenticated POST with `userIds: []` returns **all** Firebase Auth user IDs. Enables enumeration of every user in the system. |
| **Reproduce** | `curl -X POST https://<your-app>/api/auth/verify-users -H "Content-Type: application/json" -d '{"userIds":[]}'` |
| **Fix** | Require Firebase ID token; verify caller is admin (same pattern as get-firebase-user-count). For empty `userIds`, return 400 or do not return full list to non-admin. |

```ts
// Require Authorization: Bearer <idToken>, verify token, then check admin (Firestore role or ADMIN_EMAIL).
// If not admin, return 403. If userIds is empty, return 400 or require non-empty array for non-admin.
```

| **Tests** | Unauthenticated request returns 401; non-admin returns 403; empty userIds as admin can be allowed or 400 per product choice. |

---

#### C-3: admin/verify-company has no authentication

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/admin/verify-company/route.ts` (entire POST) |
| **Why it's a problem** | Anyone can approve or reject any company by sending `companyId`, `approved`, `adminUserId`. Attacker can set any company to verified or rejected. |
| **Reproduce** | `curl -X POST https://<your-app>/api/admin/verify-company -H "Content-Type: application/json" -d '{"companyId":"<id>","approved":true,"adminUserId":"fake"}'` |
| **Fix** | Require `Authorization: Bearer <idToken>`, verify token, then ensure `decodedToken.uid === adminUserId` and caller is admin (Firestore role or ADMIN_EMAIL). Use decoded uid for `verifiedBy`, not body. |

| **Tests** | Unauthenticated and non-admin get 401/403; only admin can change company status. |

---

#### C-4: notifications/update-preferences – IDOR on any user's preferences

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/notifications/update-preferences/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Caller can set `userId` to any ID and overwrite that user’s notification preferences (and `updatedAt`) in Firestore. |
| **Reproduce** | POST `{"userId":"<victim-uid>","preferences":{"email":false}}` |
| **Fix** | Require `Authorization: Bearer <idToken>`. Verify `decodedToken.uid === userId` so users can only update their own preferences. |

| **Tests** | Unauthenticated returns 401; token for user A cannot update user B’s preferences (403 or 400). |

---

#### C-5: notifications/profile-viewed – unauthenticated; fake view notifications

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/notifications/profile-viewed/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Anyone can POST `candidateId` and `viewerId` to trigger “your profile was viewed” emails to the candidate. Enables spoofing and spam. |
| **Reproduce** | POST `{"candidateId":"<uid>","viewerId":"<any-uid>"}` repeatedly. |
| **Fix** | Require `Authorization: Bearer <idToken>`. Verify `decodedToken.uid === viewerId` so only the real viewer can trigger the event. Optionally verify viewer is EMPLOYER/RECRUITER and candidate is JOB_SEEKER before sending email. |

| **Tests** | Unauthenticated returns 401; token for user A cannot use viewerId B. |

---

#### C-6: notifications/message-sent – unauthenticated; fake message notifications

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/notifications/message-sent/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Anyone can send `threadId`, `senderId`, `messageContent` and trigger in-app/email notifications to the recipient. |
| **Reproduce** | Discover or guess threadId/senderId (e.g. from URLs or enumeration), POST to trigger notifications. |
| **Fix** | Require `Authorization: Bearer <idToken>` and verify `decodedToken.uid === senderId`. Optionally verify sender is in the thread. |

| **Tests** | Unauthenticated returns 401; token uid must match senderId. |

---

#### C-7: notifications/endorsement-received – unauthenticated; fake endorsement emails

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/notifications/endorsement-received/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Anyone can POST `userId`, `endorserName`, `skill` and send “you received an endorsement” email to that user. |
| **Reproduce** | POST `{"userId":"<uid>","endorserName":"Fake","skill":"X"}` |
| **Fix** | Require `Authorization: Bearer <idToken>`. Verify the endorser (e.g. token uid) is allowed to endorse (e.g. has relationship or same org). If endorsement is created elsewhere (e.g. Firestore), consider triggering this API only from that trusted path with a short-lived internal secret. |

| **Tests** | Unauthenticated returns 401; only valid endorsers can trigger. |

---

#### C-8: admin/notify-new-company – unauthenticated; spam admin inbox

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/admin/notify-new-company/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Anyone can POST company details and send “New Company Registration” emails to ADMIN_EMAIL. Enables admin phishing/spam. |
| **Reproduce** | POST `{"companyName":"X","contactName":"Y","contactEmail":"z@evil.com",...}` |
| **Fix** | Call this only from a trusted context (e.g. employer signup flow after auth). Require Firebase idToken and verify caller is authenticated; optionally require role EMPLOYER/RECRUITER and rate limit per user. Do not expose as a public endpoint. |

| **Tests** | Unauthenticated or non-employee cannot trigger admin notification. |

---

#### C-9: auth/send-verification – unauthenticated; verification email for any user

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **File(s)** | `app/api/auth/send-verification/route.ts` (entire POST) |
| **Why it's a problem** | No auth. Anyone can request a verification email for any `userId`/`email`. Enables phishing (fake “verify your email” to victim) and Resend abuse. |
| **Reproduce** | POST `{"userId":"<uid>","email":"victim@example.com"}` |
| **Fix** | Require `Authorization: Bearer <idToken>` and verify `decodedToken.uid === userId` and `decodedToken.email === email` (or allow only for the same user). Apply rate limit per uid/email (server-side or Resend). |

| **Tests** | Unauthenticated returns 401; user can only request verification for own uid/email. |

---

### High

#### H-1: auth/verify-code – no rate limit (brute-force of 6-digit code)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **File(s)** | `app/api/auth/verify-code/route.ts` (entire POST) |
| **Why it's a problem** | Attacker who knows or guesses an email can try up to 1M codes. No rate limit on verify attempts. |
| **Reproduce** | Script that POSTs `{"email":"victim@example.com","code":"000000"}` through `999999`. |
| **Fix** | Rate limit by IP and/or email: e.g. max 5–10 attempts per 15 minutes. Return 429 with Retry-After when exceeded. Consider locking after N failures and expiring the code. |

| **Tests** | After N failed attempts, next request returns 429; success resets or decrements counter. |

---

#### H-2: Firebase Admin init logs credential details in all environments

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **File(s)** | `lib/firebase-admin.ts` (lines 19–24) |
| **Why it's a problem** | Logs `privateKey: 'SET (length: X)'` and `privateKeyStarts: '<first 20 chars>...'` in production. Log aggregation or support access could leak key material. |
| **Reproduce** | Deploy and trigger any server path that loads firebase-admin; check logs. |
| **Fix** | Remove or guard: only log in development, or log only `projectId/clientEmail set: true/false` and never key length or prefix. |

```ts
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Admin SDK initialization:', {
    projectId: projectId ? 'SET' : 'MISSING',
    clientEmail: clientEmail ? 'SET' : 'MISSING',
    privateKey: privateKey ? 'SET' : 'MISSING',
  });
}
```

| **Tests** | No assertion on log content; manual check that prod logs never contain key material. |

---

#### H-3: Middleware does not enforce auth on protected routes

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **File(s)** | `middleware.ts` (lines 4–10) |
| **Why it's a problem** | Comment says “Allow all routes for now”. So /admin, /account, /home are not protected at the edge; reliance is on client redirects and per-route checks. Slow or bypassed client can expose UI; deep links to protected pages may flash before redirect. |
| **Reproduce** | Open /admin or /account/profile without logging in; observe redirect behavior and any flashed content. |
| **Fix** | In middleware, verify Firebase session (e.g. cookie or token in cookie set by a login API). For routes under /admin, /account, /home/*, /employer, etc., redirect to login if no valid session. Use httpOnly cookie set server-side after Firebase sign-in so middleware can read it. |

| **Tests** | Request to /admin without auth cookie returns redirect to login; with auth returns next(). |

---

#### H-4: Uploads page calls non-existent API routes (404)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **File(s)** | `app/account/uploads/page.tsx` (lines 22, 31) |
| **Why it's a problem** | Page calls `/api/upload/resume` and `/api/upload/video`. Those API routes do not exist (404). Uploads never succeed; user sees “Failed to upload”. |
| **Reproduce** | Log in, go to account/uploads, select file, click Upload. |
| **Fix** | Either (1) add API routes that accept multipart upload, validate auth and file type/size, then upload to Firebase Storage (or S3) and return URL, or (2) remove this page and use only the existing Firebase Storage upload flow (FileUpload/VideoUpload on profile). |

| **Tests** | E2E: upload resume from uploads page succeeds and profile shows new resume URL (or page is removed). |

---

### Medium

#### M-1: XSS risk from innerHTML in toast

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **File(s)** | `app/home/seeker/profile-views/page.tsx` (lines 114–117) |
| **Why it's a problem** | `toast.innerHTML = ... ${message} ...` inserts `message` into DOM. If `message` ever comes from user input or API, it can execute script. |
| **Reproduce** | If `message` were user-controlled (e.g. company name), pass `<img src=x onerror=alert(1)>`. Currently callers pass fixed strings; risk is future change. |
| **Fix** | Use `textContent` for the message, or a React component that escapes. Avoid innerHTML for any dynamic text. |

```ts
const span = document.createElement('span');
span.className = 'font-semibold text-navy';
span.textContent = message;
toast.appendChild(span);
```

| **Tests** | Unit test: showToast with string containing `<script>` does not execute script (e.g. no script in DOM). |

---

#### M-2: auth/send-verification-code – in-memory rate limit resets on cold start

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **File(s)** | `app/api/auth/send-verification-code/route.ts` (lines 33–56) |
| **Why it's a problem** | Rate limit is in-process Map. On Vercel serverless, new instances have empty map; attacker can hit many instances and get more than 3 emails per minute per address. |
| **Reproduce** | Send many concurrent requests to send-verification-code; observe more than 3 emails per minute. |
| **Fix** | Use external store (e.g. Firestore, Redis, Vercel KV) keyed by email with count and reset time. Or use Resend’s rate limits and return 429 when Resend throttles. |

| **Tests** | With shared store, 4th request within 1 min for same email returns 429. |

---

#### M-3: Email verification token logged (partial)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **File(s)** | `lib/email-verification.ts` (lines 14, 20, 32) |
| **Why it's a problem** | Logs “Creating verification token for: { userId, email }” and “Generated token: <first 10 chars>...”. In production logs this reduces token entropy and can aid token guessing if logs leak. |
| **Reproduce** | Trigger send-verification flow; check logs. |
| **Fix** | Remove or guard: only in development log “Verification token created for user” (no token prefix, no email in prod). |

| **Tests** | Production build or NODE_ENV=production does not log token substring. |

---

#### M-4: verify-email route accepts token in body (idempotency / replay)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **File(s)** | `app/api/auth/verify-email/route.ts`; `lib/email-verification.ts` (verifyVerificationToken) |
| **Why it's a problem** | If token is single-use and marked used, replay returns “already used”. If not, same token could be replayed. Confirm token is marked used and expiry is enforced. |
| **Reproduce** | Call verify-email twice with same token. |
| **Fix** | Ensure token doc is updated to `used: true` and optionally `usedAt` on first successful verify; reject with 400 if already used. (Code path may already do this; verify.) |

| **Tests** | Second verify with same token returns 400 “already used”. |

---

#### M-5: job/create accepts employerId from body (trust but verify)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **File(s)** | `app/api/job/create/route.ts` (lines 20, 37, 54) |
| **Why it's a problem** | `employerId` comes from body; server checks `decoded.uid === employerId`. Correct, but if any other logic later trusts `employerId` from the same request without re-checking, it could be wrong. |
| **Reproduce** | N/A – current code is correct. |
| **Fix** | Use only `decoded.uid` for employerId when writing the job (ignore body employerId for the write). Keep body for validation only. |

```ts
const employerId = decoded.uid;
// use employerId from token, not from body, for jobData
```

| **Tests** | POST with body employerId !== token uid still creates job under token uid. |

---

### Low

#### L-1: NEXTAUTH_URL used but app uses Firebase

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **File(s)** | `lib/notifications.ts`, `lib/mailer.ts`, `lib/email.ts` (baseUrl fallback) |
| **Why it's a problem** | Confusing; NEXTAUTH_URL suggests NextAuth which isn’t used. If unset, VERCEL_URL is used. No functional bug if env is correct. |
| **Fix** | Prefer a single env var (e.g. NEXT_PUBLIC_APP_URL) for base URL and use it everywhere; remove NEXTAUTH_URL references or document as legacy. |

---

#### L-2: Prisma schema and seed present but production uses Firestore

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **File(s)** | `prisma/schema.prisma`; `package.json` build runs `prisma generate` |
| **Why it's a problem** | New contributors might think PostgreSQL is the main DB; production uses Firestore. Seed contains demo credentials (prisma/seed.ts logs). |
| **Fix** | Document in README that production is Firestore; Prisma is for seed/tooling. Remove or redact demo passwords from seed logs. |

---

#### L-3: S3 presign exists but no API route uses it

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **File(s)** | `lib/s3.ts`; `lib/validations.ts` (uploadPresignSchema) |
| **Why it's a problem** | Dead code or incomplete feature; REGION/BUCKET may be unset and getS3() could throw. |
| **Fix** | If not used, remove or add an API route that requires auth and returns presigned URL; validate key/contentType server-side. |

---

#### L-4: scripts/setup-admin.ts uses ADMIN_PASSWORD with fallback

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **File(s)** | `scripts/setup-admin.ts` (line 23) |
| **Why it's a problem** | Fallback `'your-admin-password-here'` could be run by mistake in prod. |
| **Fix** | Require ADMIN_PASSWORD from env with no default; exit with clear message if missing. |

---

## 3. Action Plan

### Step-by-step order (Critical first)

| Order | Finding | Action | Effort |
|-------|--------|--------|--------|
| 1 | C-1 | Restrict send-profile-reminder to cron only (CRON_SECRET or x-vercel-cron) | S |
| 2 | C-2 | Add auth + admin check to verify-users; do not return full UID list to unauthenticated | M |
| 3 | C-3 | Add auth + admin check to admin/verify-company; use token uid for verifiedBy | S |
| 4 | C-4 | Add Bearer token to update-preferences; enforce userId === decoded.uid | S |
| 5 | C-5 | Add Bearer token to profile-viewed; enforce viewerId === decoded.uid | S |
| 6 | C-6 | Add Bearer token to message-sent; enforce senderId === decoded.uid | S |
| 7 | C-7 | Add auth to endorsement-received; verify endorser identity | M |
| 8 | C-8 | Restrict notify-new-company to authenticated employer/recruiter (or internal only) | M |
| 9 | C-9 | Add auth to send-verification; enforce uid/email match + rate limit | M |
| 10 | H-1 | Add rate limit (IP/email) to verify-code | M |
| 11 | H-2 | Stop logging Firebase key material in production | S |
| 12 | H-3 | Add middleware auth for /admin, /account, /home (after cookie-based session exists) | L |
| 13 | H-4 | Implement /api/upload/resume and /api/upload/video (or remove uploads page) | M |
| 14 | M-1 | Replace innerHTML with textContent in profile-views toast | S |
| 15 | M-2 | Move send-verification-code rate limit to Firestore/Redis/KV | M |
| 16 | M-3, M-4, M-5 | Logging and token/job fixes as above | S |
| 17 | L-1–L-4 | Env/docs, Prisma docs, S3/presign, setup-admin password | S |

### Quick wins (do immediately)

1. **C-1** – Restrict `send-profile-reminder` to cron (add secret check).  
2. **C-3** – Add admin auth to `verify-company`.  
3. **C-4** – Add token check to `update-preferences` (userId === uid).  
4. **C-5** – Add token check to `profile-viewed` (viewerId === uid).  
5. **H-2** – Remove or guard Firebase Admin credential logging.  
6. **M-1** – Use `textContent` instead of `innerHTML` in profile-views toast.

### Suggested automated checks

- **API auth:** E2E or integration tests: all notification and admin endpoints return 401 without Bearer token; 403 when token is non-admin where required.  
- **Lint:** ESLint rule to flag `innerHTML` / `dangerouslySetInnerHTML` with dynamic content.  
- **Secrets:** CI step (e.g. grep or truffleHog) to ensure no FIREBASE_PRIVATE_KEY, RESEND_API_KEY, CRON_SECRET in code; npm audit.  
- **Env:** Checklist or script that verifies required env vars (FIREBASE_*, RESEND_API_KEY, CRON_SECRET, ADMIN_EMAIL) before deploy.

---

**End of audit.**
