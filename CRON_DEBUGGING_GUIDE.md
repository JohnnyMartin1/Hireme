# Profile Reminder Email Cron Job - Debugging Guide

## What We Fixed

1. **Authorization Method**: Updated to support both:
   - Vercel cron calls (checks for `x-vercel-cron` header)
   - Manual testing (checks for `Authorization: Bearer CRON_SECRET` header)

2. **Better Logging**: Added console.log statements to track:
   - When cron starts
   - How many users are found
   - When emails are sent
   - Any errors that occur

3. **Error Handling**: Improved error messages and responses

## How to Debug

### Step 1: Check Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and verify:

- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `EMAIL_FROM` - Email address (e.g., `HireMe <noreply@officialhireme.com>`)
- ✅ `CRON_SECRET` - A random secret string (for manual testing)
- ✅ `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., `https://www.officialhireme.com`)

**To generate CRON_SECRET:**
```bash
openssl rand -hex 32
```

### Step 2: Check Vercel Logs

1. Go to your Vercel project dashboard
2. Click on "Logs" tab
3. Filter by searching for "profile-reminders" or "cron"
4. Look for:
   - "Profile reminders cron started" - confirms the endpoint is being called
   - "Found X job seekers to check" - shows how many users are being processed
   - "Sent reminder to [email]" - confirms emails are being sent
   - Any error messages

### Step 3: Check Cron Job Status

1. Go to your Vercel project → Settings → Cron Jobs
2. You should see:
   - **Path**: `/api/cron/profile-reminders`
   - **Schedule**: `0 * * * *` (every hour)
   - **Status**: Should show when it last ran

**Note**: If you don't see the cron job listed, it might take a few minutes after deployment to appear.

### Step 4: Manual Testing

Test the endpoint manually to see if it works:

```bash
# Replace with your actual values
curl -X GET "https://www.officialhireme.com/api/cron/profile-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "sent": 2,
  "skipped": 15,
  "total": 17,
  "timestamp": "2024-02-17T20:00:00.000Z"
}
```

### Step 5: Check User Data in Firebase

Verify that users have:
- `role: "JOB_SEEKER"`
- `email` field set
- `createdAt` timestamp
- Profile completion < 70%

## Common Issues

### Issue 1: "Unauthorized" Error

**Cause**: Missing or incorrect `CRON_SECRET` or the endpoint isn't being called by Vercel cron.

**Fix**: 
- Check that `CRON_SECRET` is set in Vercel environment variables
- For manual testing, use the exact secret value
- Vercel cron calls should work automatically (they send `x-vercel-cron` header)

### Issue 2: "404 Not Found"

**Cause**: The route hasn't been deployed yet or path is wrong.

**Fix**:
- Wait for deployment to complete
- Verify the file exists at `app/api/cron/profile-reminders/route.ts`
- Check that `vercel.json` has the correct path: `/api/cron/profile-reminders`

### Issue 3: Emails Not Sending

**Cause**: Resend API key issue or email validation.

**Fix**:
- Check `RESEND_API_KEY` is correct in Vercel
- Verify `EMAIL_FROM` is a verified domain in Resend
- Check Resend dashboard for email delivery status
- Look at Vercel logs for specific error messages

### Issue 4: No Users Found

**Cause**: Users might not have `role: "JOB_SEEKER"` or other data issues.

**Fix**:
- Check Firebase to verify user roles
- Ensure users have `createdAt` timestamps
- Verify profile completion calculation is working

### Issue 5: Cron Not Running

**Cause**: Cron job might not be configured correctly or Vercel hasn't recognized it.

**Fix**:
- Wait 5-10 minutes after deployment
- Check Settings → Cron Jobs in Vercel
- Verify `vercel.json` has the cron configuration
- Try redeploying

## Testing Reminder Logic

The cron sends reminders:
1. **3 hours after signup** - First reminder (only if no reminder sent yet)
2. **Daily at 3pm EST (20:00 UTC)** - After first day, once per day

To test:
- Create a test user with `createdAt` set to 3+ hours ago
- Set profile completion < 70%
- Manually trigger the cron endpoint
- Check if email is sent

## Next Steps

1. ✅ Push these changes to GitHub
2. ✅ Wait for Vercel deployment to complete
3. ✅ Check Vercel Logs after the next cron run (hourly)
4. ✅ Verify emails are being sent
5. ✅ Check Resend dashboard for email delivery status
