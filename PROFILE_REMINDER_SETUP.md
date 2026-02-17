# Profile Completion Reminder Emails

## Overview
Automated reminder emails are sent to users to encourage them to complete their profile to at least 70% completion.

## Reminder Schedule
1. **First Reminder**: Sent 3 hours after user signs up
2. **Daily Reminders**: Sent every day at 3pm EST (20:00 UTC) until profile reaches 70% completion

## How It Works
- A Vercel Cron job runs every hour (`0 * * * *`)
- The cron checks all job seekers with profiles below 70% completion
- For each eligible user:
  - **3-hour reminder**: If user signed up 3+ hours ago and hasn't received a reminder yet
  - **Daily reminder**: If user signed up 1+ day ago, it's 3pm EST (20:00 UTC), and no reminder was sent today

## Setup Requirements

### 1. Environment Variables
Make sure these are set in your Vercel project:
- `RESEND_API_KEY` - Your Resend API key for sending emails
- `EMAIL_FROM` - Email address to send from (or defaults to `onboarding@resend.dev`)
- `CRON_SECRET` - Secret token to secure the cron endpoint (generate a random string)
- `NEXT_PUBLIC_APP_URL` - Your app's URL (or Vercel will auto-detect)

### 2. Vercel Cron Configuration
The cron job is configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/profile-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 3. Setting CRON_SECRET in Vercel
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a random secure string (e.g., use `openssl rand -hex 32`)
   - **Environment**: Production, Preview, Development (as needed)

## Testing
To test the cron job manually:
```bash
curl -X GET "https://your-domain.com/api/cron/profile-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Email Template
The reminder email includes:
- Personalized greeting with user's name
- Clear call-to-action button to complete profile
- Benefits of completing profile
- Support contact information

## Data Tracking
The system tracks:
- `lastProfileReminderSent` - Timestamp of last reminder sent (stored in user document)
- Prevents duplicate reminders on the same day
- Automatically stops sending when profile reaches 70% completion

## Notes
- Reminders only sent to users with `role: 'JOB_SEEKER'`
- Users must have an email address
- Profile completion is calculated using the `calculateCompletion` function (10 sections, 10% each)
- The cron runs in UTC timezone (3pm EST = 20:00 UTC)
