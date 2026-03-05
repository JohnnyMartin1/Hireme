# Step-by-step: What You Need to Fix

Follow these in order. Nothing requires code changes unless you want endorsement emails back.

---

## Step 1: Set CRON_SECRET in Vercel (required for reminder emails)

Your cron job calls the profile-reminder API with a secret. You need to give Vercel that secret.

1. Go to [vercel.com](https://vercel.com) and open your **HireMe** project.
2. Click **Settings** (top tab).
3. In the left sidebar, click **Environment Variables**.
4. Click **Add New** (or **Add**).
5. **Name:** `CRON_SECRET`
6. **Value:** Pick a long random string (e.g. 32+ characters). You can generate one:
   - In Terminal: `openssl rand -hex 24`  
   - Or use a password generator and paste a long random string.
7. Select environments: **Production**, and **Preview** if you run crons there.
8. Click **Save**.

**Why:** The profile-reminder API now only accepts requests that send this secret. Your cron is already sending it; it just needs to match what’s in Vercel.

---

## Step 2: Confirm ADMIN_EMAIL (optional but recommended)

Admin-only actions (e.g. verify company, list all users) use `ADMIN_EMAIL` as a fallback when the Firestore user doc doesn’t have `role: ADMIN`.

1. In the same **Environment Variables** page in Vercel, check if **ADMIN_EMAIL** exists.
2. If it doesn’t, add it:
   - **Name:** `ADMIN_EMAIL`
   - **Value:** Your admin account email (e.g. `officialhiremeapp@gmail.com`).
   - **Environments:** Production (and Preview if you use it).
3. If it already exists, make sure the value is the email you actually use to log in as admin.

**Why:** So the backend can recognize you as admin even if the Firestore `users` doc is missing or wrong.

---

## Step 3: Redeploy after env changes

Environment variables are applied on the next deploy.

1. Either push a small commit to trigger a deploy, or  
2. In Vercel: **Deployments** → open the latest deployment → **⋯** → **Redeploy** (use “Redeploy with existing Build Cache” if you want it fast).

After deploy, the cron will use the new `CRON_SECRET` and admin checks will use `ADMIN_EMAIL` if set.

---

## Step 4: Firestore – no action

The **verify-code** rate limit uses a Firestore collection `verifyCodeAttempts`.  
It is created automatically the first time someone hits the verify-code API. You don’t need to create it or change any rules.

---

## Step 5: Test the main flows (recommended)

Quick checks so you know nothing is broken:

1. **Log in** as a normal user (job seeker or employer).
2. **Profile view (employer/recruiter):** Open a candidate profile; the “profile viewed” notification should still work (we now send the token).
3. **Messages:** Send a message from the candidate or messages page; the “new message” email should still send.
4. **Notification preferences:** In account/settings, toggle a notification preference and save; it should save without error.
5. **Admin:** Log in as admin, open **Verify companies**, approve or reject a company; it should succeed (and send the token).
6. **Company signup:** Register a new company; verification email and “new company” admin email should still send.

If any of these fail, check the browser Network tab for the failing request and the response (401/403 = auth problem; then check that the token is being sent and that env vars are set and redeployed).

---

## Step 6 (optional): Endorsement notification emails

Right now, the **public** endorse form (`/endorse/[userId]`) does **not** send the “you received an endorsement” email, because that API now requires a logged-in user and the form is public. Endorsements are still **saved**; only the email is skipped.

You have two options:

### Option A: Require sign-in to endorse (and send email again)

- Make the endorse page require the user to be logged in (e.g. redirect to login if no `user`).
- When they submit, get the token: `const token = await user.getIdToken();`
- Call: `createEndorsement(userId, endorsementData, token)` instead of `createEndorsement(userId, endorsementData)`.

Then the API will accept the request and send the endorsement email again.

### Option B: Keep public form, send email from Firestore

- Leave the endorse form public (no login).
- In Firebase (or your backend), add a **Firestore-triggered Cloud Function** that runs when a document is created in the `endorsements` collection.
- In that function, call your notification logic (or the same email-sending code) to send “you received an endorsement” to the candidate.

If you don’t care about endorsement emails, you can skip Step 6.

---

## Checklist

- [ ] **Step 1:** Added `CRON_SECRET` in Vercel.
- [ ] **Step 2:** Checked or added `ADMIN_EMAIL` in Vercel.
- [ ] **Step 3:** Redeployed after changing env vars.
- [ ] **Step 4:** (No action) Firestore auto-creates `verifyCodeAttempts`.
- [ ] **Step 5:** Tested login, profile view, messages, notification preferences, admin verify-company, company signup.
- [ ] **Step 6 (optional):** Decided whether to re-enable endorsement emails (Option A or B) or leave as-is.

That’s it. The only required steps are **1** (CRON_SECRET), **2** (ADMIN_EMAIL if you use admin features), and **3** (redeploy). The rest is verification and optional endorsement email behavior.
