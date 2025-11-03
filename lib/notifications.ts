import { sendMail } from './email';
import { adminDb } from './firebase-admin';

// Notification types for candidates
export type CandidateNotificationType = 
  | 'new_recruiter_message'
  | 'recruiter_followup'
  | 'new_endorsement'
  | 'profile_viewed';

// Notification preferences interface
export interface NotificationPreferences {
  new_recruiter_message: boolean;
  recruiter_followup: boolean;
  new_endorsement: boolean;
  profile_viewed: boolean;
}

// Default preferences (all enabled)
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  new_recruiter_message: true,
  recruiter_followup: true,
  new_endorsement: true,
  profile_viewed: true,
};

/**
 * Get user's notification preferences from Firestore (using Admin SDK)
 */
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('User document not found, using default preferences');
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    
    const data = userDoc.data();
    
    // Return stored preferences or defaults
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(data?.notificationPreferences || {}),
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Update user's notification preferences in Firestore (using Admin SDK)
 * Note: This function is now primarily used by the API route
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Updating preferences for user:', userId);
    console.log('🔍 Preferences to update:', preferences);
    
    const userRef = adminDb.collection('users').doc(userId);
    
    // Get current preferences
    const userDoc = await userRef.get();
    const currentPreferences = userDoc.exists 
      ? (userDoc.data()?.notificationPreferences || {})
      : {};
    
    console.log('📄 Current preferences:', currentPreferences);
    
    // Merge new preferences with existing ones
    const updatedPreferences = { ...currentPreferences, ...preferences };
    console.log('📝 Updated preferences:', updatedPreferences);
    
    // Update the document (or create if it doesn't exist)
    await userRef.set({
      notificationPreferences: updatedPreferences,
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log('✅ Notification preferences updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error updating notification preferences:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return { success: false, error: error.message || 'Failed to update preferences' };
  }
}

/**
 * Check if user should receive a specific notification
 */
async function shouldSendNotification(
  userId: string,
  notificationType: CandidateNotificationType
): Promise<boolean> {
  const preferences = await getUserNotificationPreferences(userId);
  return preferences[notificationType] === true;
}

/**
 * Send notification: New recruiter message
 */
export async function sendNewRecruiterMessageNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  recruiterName: string,
  recruiterCompany: string,
  messagePreview: string
): Promise<void> {
  const shouldSend = await shouldSendNotification(candidateId, 'new_recruiter_message');
  
  if (!shouldSend) {
    console.log(`Notification disabled for user ${candidateId}: new_recruiter_message`);
    return;
  }
  
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const messagesUrl = `${baseUrl}/messages`;
  
  await sendMail({
    to: candidateEmail,
    subject: `New message from ${recruiterName} at ${recruiterCompany}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Message</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>${recruiterName}</strong> from <strong>${recruiterCompany}</strong> has reached out to you!
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #000080; margin: 20px 0;">
            <p style="color: #666; font-style: italic; margin: 0;">"${messagePreview}"</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${messagesUrl}" 
               style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                      display: inline-block; font-weight: bold; font-size: 16px;">
              View Message
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
            You're receiving this email because you have new recruiter message notifications enabled.
          </p>
          <p style="color: #666; font-size: 14px;">
            <a href="${baseUrl}/account/${candidateId}/settings#notifications" style="color: #000080;">Update notification preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `New message from ${recruiterName} at ${recruiterCompany}: "${messagePreview}". View at: ${messagesUrl}`,
  });
  
  console.log(`✅ New recruiter message notification sent to ${candidateEmail}`);
}

/**
 * Send notification: Recruiter follow-up message
 */
export async function sendRecruiterFollowUpNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  recruiterName: string,
  recruiterCompany: string,
  messagePreview: string,
  threadId: string
): Promise<void> {
  const shouldSend = await shouldSendNotification(candidateId, 'recruiter_followup');
  
  if (!shouldSend) {
    console.log(`Notification disabled for user ${candidateId}: recruiter_followup`);
    return;
  }
  
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const threadUrl = `${baseUrl}/messages/${threadId}`;
  
  await sendMail({
    to: candidateEmail,
    subject: `${recruiterName} replied to your conversation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Reply</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>${recruiterName}</strong> from <strong>${recruiterCompany}</strong> has replied to your conversation.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ADD8E6; margin: 20px 0;">
            <p style="color: #666; font-style: italic; margin: 0;">"${messagePreview}"</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${threadUrl}" 
               style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                      display: inline-block; font-weight: bold; font-size: 16px;">
              View Conversation
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
            You're receiving this email because you have recruiter follow-up notifications enabled.
          </p>
          <p style="color: #666; font-size: 14px;">
            <a href="${baseUrl}/account/${candidateId}/settings#notifications" style="color: #000080;">Update notification preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `${recruiterName} from ${recruiterCompany} replied: "${messagePreview}". View at: ${threadUrl}`,
  });
  
  console.log(`✅ Recruiter follow-up notification sent to ${candidateEmail}`);
}

/**
 * Send notification: New endorsement received
 */
export async function sendNewEndorsementNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  endorserName: string,
  skill: string
): Promise<void> {
  const shouldSend = await shouldSendNotification(candidateId, 'new_endorsement');
  
  if (!shouldSend) {
    console.log(`Notification disabled for user ${candidateId}: new_endorsement`);
    return;
  }
  
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const profileUrl = `${baseUrl}/account/profile`;
  
  await sendMail({
    to: candidateEmail,
    subject: `${endorserName} endorsed your ${skill} skills!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⭐ New Endorsement</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Great news! <strong>${endorserName}</strong> has endorsed your skills.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
            <p style="color: #000080; font-size: 20px; font-weight: bold; margin: 0;">${skill}</p>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            Endorsements help strengthen your profile and increase your visibility to recruiters!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}" 
               style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                      display: inline-block; font-weight: bold; font-size: 16px;">
              View Your Profile
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
            You're receiving this email because you have endorsement notifications enabled.
          </p>
          <p style="color: #666; font-size: 14px;">
            <a href="${baseUrl}/account/${candidateId}/settings#notifications" style="color: #000080;">Update notification preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `${endorserName} endorsed your ${skill} skills! View your profile at: ${profileUrl}`,
  });
  
  console.log(`✅ New endorsement notification sent to ${candidateEmail}`);
}

/**
 * Send notification: Profile viewed by recruiter
 */
export async function sendProfileViewedNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  recruiterName: string,
  companyName: string,
  viewerProfileUrl?: string
): Promise<void> {
  const shouldSend = await shouldSendNotification(candidateId, 'profile_viewed');
  
  if (!shouldSend) {
    console.log(`Notification disabled for user ${candidateId}: profile_viewed`);
    return;
  }
  
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const profileViewsUrl = `${baseUrl}/home/seeker/profile-views`;
  
  await sendMail({
    to: candidateEmail,
    subject: `${companyName} viewed your profile`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">👀 Profile View</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            <strong>${recruiterName}</strong> from <strong>${companyName}</strong> just viewed your profile!
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #ADD8E6;">
            <div style="font-size: 48px; margin-bottom: 10px;">🏢</div>
            <p style="color: #000080; font-size: 18px; font-weight: bold; margin: 5px 0;">${companyName}</p>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">${recruiterName}</p>
          </div>
          
          <p style="font-size: 16px; color: #333; margin: 20px 0;">
            This could be a great opportunity! Consider reaching out or checking their company profile.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileViewsUrl}" 
               style="background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%); color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                      display: inline-block; font-weight: bold; font-size: 16px;">
              See Who Viewed Your Profile
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
            You're receiving this email because you have profile view notifications enabled.
          </p>
          <p style="color: #666; font-size: 14px;">
            <a href="${baseUrl}/account/${candidateId}/settings#notifications" style="color: #000080;">Update notification preferences</a>
          </p>
        </div>
      </div>
    `,
    text: `${recruiterName} from ${companyName} viewed your profile. See all profile views at: ${profileViewsUrl}`,
  });
  
  console.log(`✅ Profile viewed notification sent to ${candidateEmail}`);
}

