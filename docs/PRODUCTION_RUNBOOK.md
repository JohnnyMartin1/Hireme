# HireMe production runbook

Operational steps for deploy, rollback, backups, and incidents. Not legal advice.

## 1. Environment (Vercel)

Set at minimum:

- Firebase client: `NEXT_PUBLIC_FIREBASE_*`
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- App URLs: `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`
- Email: `RESEND_API_KEY`, `EMAIL_FROM` (or SMTP equivalents)
- `CRON_SECRET` for scheduled HTTP routes
- `CALENDAR_TOKEN_ENCRYPTION_KEY` (required in production-like deploys for calendar OAuth persistence)
- **Distributed rate limits:** `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or Upstash `UPSTASH_REDIS_*`) for public-scale deployments
- **Sentry (optional):** `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` (same value), and for source maps `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

## 2. Deploy application

1. Push to GitHub; Vercel builds with `npm run build`.
2. Confirm build green; check function logs for `[hireme][rate-limit]` warnings if KV is missing in production.

## 3. Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

- Rules include `auditLogs` (client deny-all) and existing collections.
- Deploy indexes when `firestore.indexes.json` changes.

## 4. Storage CORS (video signed PUT)

Bucket CORS is **not** in repo. After Storage rules deploy, ensure GCS CORS allows your web origins (localhost + production) for `PUT`/`OPTIONS` to the Firebase Storage bucket. Example file: `cors.json` in repo root (apply with `gsutil cors set cors.json gs://YOUR_BUCKET`).

## 5. Public projections bootstrap

Admin bearer: `POST /api/admin/bootstrap-public-candidate-profiles` with JSON body `{ "startAfter": "..." }` for paging until `nextStartAfter` is null.

## 6. Backups and recovery

- **Firestore:** Use Google Cloud scheduled exports or point-in-time recovery per your GCP project settings. Document export bucket and restore procedure in your org.
- **Storage:** Same project backups / object versioning policy; private candidate objects live under `resumes/`, `transcripts/`, `videos/`.
- **Retention:** Account deletion API removes Firestore user doc and related client-readable data paths documented in code; Auth user deletion is best-effort after Firestore batch.

## 7. Rollback

- Vercel: promote previous deployment.
- Firebase: keep prior `firestore.rules` / `storage.rules` in git tags; redeploy previous revision with `firebase deploy --only ...`.

## 8. Incident checklist

1. Check Vercel errors and Sentry (if enabled).
2. Verify Firebase rules deployed and match repo.
3. Verify KV/Upstash reachable if rate limits behave unexpectedly.
4. For auth spikes, review verification and notification routes (rate limited).

## 9. Audit logs

Sensitive actions append to `auditLogs` (Admin SDK only). Query in GCP console with admin service account; do not expose to clients.
