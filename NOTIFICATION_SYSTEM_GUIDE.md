# Email Notification System for Candidates

## Overview

The HireMe platform now has a fully functional email notification system for candidates using Resend. Candidates can control their notification preferences from the Settings page, and emails are automatically sent when specific events occur.

## Features

### 1. Notification Types

**For Candidates:**
- **New recruiter message** - When a recruiter reaches out for the first time
- **Recruiter follow-up message** - When a recruiter replies to an existing conversation
- **New endorsement received** - When someone endorses their skills
- **Profile viewed by recruiter** - When a recruiter views their profile

### 2. User Preferences

- Preferences are stored in Firestore under `users/{userId}/notificationPreferences`
- All preferences default to `true` (enabled)
- Candidates can toggle each notification type on/off in Settings → Notifications
- Preferences are automatically synced with Firestore

## Usage for Developers

### Sending Notifications

Import the notification functions from `lib/notifications.ts`:

```typescript
import {
  sendNewRecruiterMessageNotification,
  sendRecruiterFollowUpNotification,
  sendNewEndorsementNotification,
  sendProfileViewedNotification,
} from '@/lib/notifications';
```

### Example: New Recruiter Message

```typescript
// When a recruiter sends a message to a candidate for the first time
await sendNewRecruiterMessageNotification(
  candidateId,          // Candidate's user ID
  candidateEmail,       // Candidate's email
  candidateName,        // Candidate's display name
  recruiterName,        // Recruiter's name
  recruiterCompany,     // Company name
  messagePreview        // First 100 characters of the message
);
```

### Example: Recruiter Follow-up

```typescript
// When a recruiter replies to an existing thread
await sendRecruiterFollowUpNotification(
  candidateId,
  candidateEmail,
  candidateName,
  recruiterName,
  recruiterCompany,
  messagePreview,
  threadId              // Message thread ID for deep linking
);
```

### Example: New Endorsement

```typescript
// When someone endorses a candidate's skill
await sendNewEndorsementNotification(
  candidateId,
  candidateEmail,
  candidateName,
  endorserName,         // Name of person who endorsed
  skill                 // The skill that was endorsed (e.g., "JavaScript")
);
```

### Example: Profile Viewed

```typescript
// When a recruiter views a candidate's profile
await sendProfileViewedNotification(
  candidateId,
  candidateEmail,
  candidateName,
  recruiterName,
  companyName,
  viewerProfileUrl      // Optional: URL to recruiter's profile
);
```

## Integration Points

### Where to Add Notification Calls

1. **New Recruiter Message** - Add to message creation logic when:
   - A recruiter initiates a new conversation with a candidate
   - Check if this is the first message in the thread

2. **Recruiter Follow-up** - Add to message creation logic when:
   - A recruiter replies to an existing thread
   - The previous message was from the candidate

3. **New Endorsement** - Add to endorsement creation logic when:
   - Someone successfully endorses a candidate's skill
   - After the endorsement is saved to Firestore

4. **Profile Viewed** - Add to profile viewing logic when:
   - A recruiter/employer views a candidate's profile
   - Consider debouncing (e.g., once per day per recruiter)

### Example Integration: Message Creation

```typescript
// In your message sending API/function
export async function sendMessage(
  senderId: string,
  recipientId: string,
  message: string,
  threadId?: string
) {
  // ... save message to Firestore ...
  
  // Check if sender is recruiter and recipient is candidate
  const { data: senderProfile } = await getDocument('users', senderId);
  const { data: recipientProfile } = await getDocument('users', recipientId);
  
  if (
    (senderProfile.role === 'RECRUITER' || senderProfile.role === 'EMPLOYER') &&
    recipientProfile.role === 'JOB_SEEKER'
  ) {
    // Determine if this is a new conversation or follow-up
    if (!threadId || isFirstMessageInThread) {
      await sendNewRecruiterMessageNotification(
        recipientId,
        recipientProfile.email,
        recipientProfile.name || recipientProfile.firstName,
        senderProfile.name || senderProfile.firstName,
        senderProfile.company || 'Company',
        message.substring(0, 100)
      );
    } else {
      await sendRecruiterFollowUpNotification(
        recipientId,
        recipientProfile.email,
        recipientProfile.name || recipientProfile.firstName,
        senderProfile.name || senderProfile.firstName,
        senderProfile.company || 'Company',
        message.substring(0, 100),
        threadId
      );
    }
  }
}
```

## Firestore Schema

### Notification Preferences Structure

```typescript
// users/{userId}
{
  email: string,
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'RECRUITER',
  // ... other user fields ...
  notificationPreferences: {
    // Candidate preferences
    new_recruiter_message: boolean,
    recruiter_followup: boolean,
    new_endorsement: boolean,
    profile_viewed: boolean,
    
    // Employer preferences (if applicable)
    new_candidate_messages: boolean,
    candidate_applied: boolean,
    weekly_digest: boolean,
    billing_alerts: boolean,
  }
}
```

## Email Templates

All email templates follow HireMe's brand guidelines:
- Navy blue (#000080) and light blue (#ADD8E6) gradient headers
- Clean, professional design
- Clear call-to-action buttons
- Settings link in footer for easy preference management
- Mobile-responsive HTML

## Testing

### Development Testing

In development mode, emails are logged to the console if Resend API key is not configured:

```
📧 EMAIL SENT (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: candidate@example.com
Subject: New message from John at TechCorp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Production Setup

Ensure these environment variables are set:

```env
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

### Testing Checklist

- [ ] Candidate can toggle notification preferences
- [ ] Preferences are saved to Firestore
- [ ] Preferences persist across sessions
- [ ] Emails respect user preferences (don't send if disabled)
- [ ] Email links point to correct pages
- [ ] Settings link in email footer works
- [ ] Email rendering looks good on mobile and desktop
- [ ] Notification toast appears when saving preferences

## API Endpoints

### Update Notification Preferences

```typescript
POST /api/notifications/update-preferences

Body: {
  userId: string,
  preferences: {
    [key: string]: boolean
  }
}

Response: {
  success: boolean,
  error?: string
}
```

## Monitoring

Monitor notification delivery in production:

1. Check Resend dashboard for delivery rates
2. Monitor API logs for notification errors
3. Track user preference changes
4. Monitor bounce rates and complaints

## Future Enhancements

Potential improvements for the notification system:

1. **Digest Emails** - Batch notifications and send daily/weekly summaries
2. **In-App Notifications** - Add browser/app notifications
3. **SMS Notifications** - For urgent messages
4. **Notification History** - Show users their recent notifications
5. **Advanced Filtering** - Granular control (e.g., only from specific companies)
6. **Unsubscribe Links** - One-click unsubscribe from all notifications
7. **Email Templates** - Customizable templates per user preference
8. **Quiet Hours** - Don't send notifications during user-specified times

## Troubleshooting

### Emails not sending

1. Check Resend API key is valid: `echo $RESEND_API_KEY`
2. Verify email domain is verified in Resend dashboard
3. Check console logs for error messages
4. Ensure `EMAIL_FROM` uses verified domain

### Preferences not saving

1. Check browser console for API errors
2. Verify Firestore rules allow user to update their own document
3. Check network tab for failed requests
4. Ensure user is authenticated

### Wrong email content

1. Verify correct function is being called
2. Check parameters passed to notification functions
3. Review email templates in `lib/notifications.ts`

## Support

For issues or questions about the notification system:
1. Check console logs for detailed error messages
2. Review Firestore for user preferences
3. Check Resend dashboard for delivery status
4. Review this guide for integration examples

