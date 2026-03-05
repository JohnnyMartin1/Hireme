# Audit Fixes Applied

Summary of security and reliability fixes applied from `REPO_AUDIT.md`.

---

## What was fixed

### Critical (all 9)

- **C-1** `send-profile-reminder`: Only callable by cron (`CRON_SECRET` or `x-vercel-cron`). Cron job already sends the secret.
- **C-2** `verify-users`: Requires Bearer token. Empty `userIds` returns all UIDs **only** for admin; non-admin gets 403. Non-empty list requires any authenticated user.
- **C-3** `admin/verify-company`: Requires admin Bearer token; `verifiedBy` set from token UID (not body).
- **C-4** `notifications/update-preferences`: Requires Bearer token; caller can update only their own `userId`.
- **C-5** `notifications/profile-viewed`: Requires Bearer token; `viewerId` must match token UID.
- **C-6** `notifications/message-sent`: Requires Bearer token; `senderId` must match token UID.
- **C-7** `notifications/endorsement-received`: Requires Bearer token (any authenticated user).
- **C-8** `admin/notify-new-company`: Requires Bearer token; `contactEmail` must match token email (only the new registrant can trigger).
- **C-9** `auth/send-verification`: Requires Bearer token; `userId` and `email` must match token.

### High

- **H-1** `auth/verify-code`: Rate limit 10 attempts per email per 15 minutes (Firestore collection `verifyCodeAttempts`). Resets on success.
- **H-2** `lib/firebase-admin.ts`: No longer logs private key length or prefix; only logs credential presence in development.

### Medium

- **M-1** `profile-views` toast: Uses `textContent` instead of `innerHTML` for the message (XSS-safe).

---

## What you need to do

1. **CRON_SECRET**  
   Ensure `CRON_SECRET` is set in Vercel (and locally if you run the cron). The profile-reminders cron already sends `Authorization: Bearer <CRON_SECRET>` when calling `send-profile-reminder`.

2. **Firestore collection**  
   `verify-code` rate limiting uses collection `verifyCodeAttempts`. Firestore will create it on first write; no manual setup.

3. **Admin / verify-company**  
   The admin verify-companies page now sends the Firebase id token. Ensure admins are logged in with an account that has `role === 'ADMIN'` in Firestore or email matches `ADMIN_EMAIL`.

4. **Endorsement emails (optional)**  
   The public endorse form (`/endorse/[userId]`) does **not** send a token, so **endorsement notification emails are no longer sent** for that form. Endorsements are still saved. To send emails again you can:
   - Require sign-in on the endorse page and pass `user.getIdToken()` into `createEndorsement(..., token)`, or
   - Use a Firestore-triggered Cloud Function to send the email when an endorsement doc is created.

5. **Debug page**  
   `app/debug/page.tsx` calls `getProfilesByRole` without a token; it still works but returns unfiltered Firestore results (no “verify users in Auth” step). Add auth + token if you want the same filtering there.

---

## Client call sites updated

- **Candidate profile**: `trackProfileView(..., idToken)`; token from `user.getIdToken()`.
- **Messages**: `sendMessage(..., idToken)` on candidate page, messages/candidate page, messages/[threadId] page.
- **Notification preferences**: Settings page sends `Authorization: Bearer <token>`.
- **Verify company**: Admin verify-companies page sends `Authorization: Bearer <token>`.
- **Company signup**: Sends token for `send-verification` and `notify-new-company`.
- **Recruiter signup, verify-email page, EmailVerificationBanner**: Send token for `send-verification`.
- **Admin users list**: Sends token for `verify-users`.
- **Search candidates**: `getProfilesByRole('JOB_SEEKER', token)` in all three call sites.

---

## Not done in this pass

- **H-3** Middleware auth (e.g. cookie-based session) for `/admin`, `/account`, `/home` — larger change; recommended after these fixes.
- **H-4** `/api/upload/resume` and `/api/upload/video` — still missing; uploads page will 404 until those routes exist or the page is removed.
- **M-2** send-verification-code rate limit in Firestore/Redis (currently in-memory; resets on serverless cold start).
