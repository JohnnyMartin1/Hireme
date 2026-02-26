# Vercel Cron Job - Manual Setup Required

## The Problem
Even though `vercel.json` has the cron configuration and the route builds successfully, Vercel isn't recognizing it. This suggests Vercel may require cron jobs to be added through the dashboard UI.

## Solution: Add Cron Job Manually in Vercel Dashboard

### Step 1: Go to Vercel Dashboard
1. Navigate to: https://vercel.com/john-martins-projects-1461e933/hireme
2. Click **Settings** (in the top navigation)
3. Click **Cron Jobs** (in the left sidebar)

### Step 2: Add New Cron Job
1. Click **"Add Cron Job"** or **"Create Cron Job"** button
2. Fill in the form:
   - **Path**: `/api/cron/profile-reminders`
   - **Schedule**: `0 * * * *` (every hour)
   - **Description** (optional): "Profile completion reminder emails"
3. Click **Save** or **Create**

### Step 3: Verify
- The cron job should now appear in the list
- It should show as "Active" or "Enabled"
- The deployment summary should show "Cron Jobs: 1"

## Why This Might Be Needed

Vercel may require:
1. **Manual activation** - Even with vercel.json, cron jobs might need to be activated in the dashboard
2. **Project settings** - Cron jobs might need to be enabled at the project level
3. **First-time setup** - The first cron job might need to be added manually, then vercel.json works for subsequent ones

## After Manual Setup

Once the cron job is added manually:
- It should start running automatically
- You can test it manually using the curl command
- Future updates to vercel.json should work automatically

## Test After Setup

```bash
curl -X GET "https://www.officialhireme.com/api/cron/profile-reminders" \
  -H "Authorization: Bearer asdflkjasde897221kaje291khsalkf92"
```

Expected response: JSON with `success: true` and counts of sent/skipped emails.
