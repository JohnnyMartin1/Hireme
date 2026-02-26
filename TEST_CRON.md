# Testing the Profile Reminder Cron Job

## Method 1: Using curl (Terminal/Command Line)

Replace `YOUR_DOMAIN` with your Vercel domain and `YOUR_CRON_SECRET` with the value you set in Vercel environment variables.

```bash
curl -X GET "https://YOUR_DOMAIN.vercel.app/api/cron/profile-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Example:**
```bash
curl -X GET "https://hireme-app.vercel.app/api/cron/profile-reminders" \
  -H "Authorization: Bearer asdflkjasde89722lkaje291khsa"
```

## Method 2: Using a Browser Extension (like REST Client)

1. Install a REST client extension (e.g., "REST Client" for VS Code, or "Postman" browser extension)
2. Make a GET request to: `https://YOUR_DOMAIN.vercel.app/api/cron/profile-reminders`
3. Add a header:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_CRON_SECRET`

## Method 3: Using JavaScript (Browser Console)

Open your browser's developer console and run:

```javascript
fetch('https://YOUR_DOMAIN.vercel.app/api/cron/profile-reminders', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_CRON_SECRET'
  }
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## Expected Response

If successful, you should see a JSON response like:

```json
{
  "success": true,
  "sent": 2,
  "skipped": 15,
  "timestamp": "2024-01-15T20:00:00.000Z"
}
```

- `sent`: Number of reminder emails sent
- `skipped`: Number of users skipped (already 70%+ complete, already sent today, etc.)
- `timestamp`: When the cron ran

If there are errors, you'll see:
```json
{
  "error": "Error message here"
}
```

## Common Issues

1. **401 Unauthorized**: Check that your `CRON_SECRET` matches exactly (no extra spaces)
2. **404 Not Found**: The deployment might not be complete yet, or the path is wrong
3. **500 Internal Server Error**: Check Vercel logs for details

## Check Vercel Logs

1. Go to your Vercel project
2. Click on "Logs" tab
3. Filter by "cron" or search for "profile-reminders"
4. You'll see execution logs and any errors

## Testing Checklist

- [ ] Deployment is complete and ready
- [ ] `CRON_SECRET` is set in Vercel environment variables
- [ ] Test endpoint returns 200 status (not 401 or 404)
- [ ] Response shows `success: true`
- [ ] Check Vercel logs for execution details
