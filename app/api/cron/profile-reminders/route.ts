import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const COMPLETION_THRESHOLD = 70;

/** Server-side profile completion calculation (same logic as ProfileCompletionProvider). */
function calculateCompletion(p: Record<string, unknown> | null): number {
  if (!p) return 0;
  const completedSections = [
    !!(p.firstName && p.lastName && p.headline),
    !!(
      Array.isArray(p.education) &&
      p.education.length > 0 &&
      (p.education as any[]).every(
        (edu: any) =>
          edu.school && edu.degree && edu.majors?.length > 0 && edu.graduationYear
      )
    ),
    !!(
      (p.locations as any[])?.length > 0 &&
      (p.workPreferences as any[])?.length > 0 &&
      (p.jobTypes as any[])?.length > 0
    ),
    !!(p.skills as any[])?.length,
    !!(
      p.experience ||
      (p.extracurriculars as any[])?.length ||
      (p.certifications as any[])?.length ||
      (p.languages as any[])?.length
    ),
    !!(p.careerInterests as any[])?.length,
    !!(
      p.workAuthorization &&
      ((p.workAuthorization as any).authorizedToWork != null ||
        (p.workAuthorization as any).requiresVisaSponsorship != null)
    ),
    !!(p.bio || p.linkedinUrl || p.portfolioUrl),
    !!(p.profileImageUrl && p.resumeUrl),
    !!p.videoUrl,
  ];
  const completedCount = completedSections.filter(Boolean).length;
  return Math.floor((completedCount / 10) * 100);
}

function isCronAuthorized(request: NextRequest): boolean {
  const cronHeader = request.headers.get('x-vercel-cron');
  if (cronHeader === 'true') return true;
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    if (!baseUrl) {
      console.warn('[cron/profile-reminders] NEXT_PUBLIC_APP_URL not set');
    }

    // Run orphan cleanup first so deleted Auth users don't get reminders
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      try {
        const cleanupRes = await fetch(`${baseUrl}/api/auth/cleanup-orphaned-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cronSecret}` },
        });
        if (cleanupRes.ok) {
          const cleanupData = await cleanupRes.json();
          console.log('[cron/profile-reminders] Cleanup:', cleanupData.stats?.deletedUsers ?? 0, 'orphaned users deleted');
        } else {
          console.warn('[cron/profile-reminders] Cleanup failed:', cleanupRes.status);
        }
      } catch (e) {
        console.warn('[cron/profile-reminders] Cleanup error:', e);
      }
    }

    const usersRef = adminDb.collection('users');
    const q = usersRef.where('role', '==', 'JOB_SEEKER');
    const snapshot = await q.get();

    const toRemind: { email: string; firstName?: string }[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const email = data.email as string | undefined;
      if (!email || typeof email !== 'string') return;
      const completion = calculateCompletion(data);
      if (completion < COMPLETION_THRESHOLD) {
        toRemind.push({
          email,
          firstName: (data.firstName as string) || undefined,
        });
      }
    });

    console.log(
      `[cron/profile-reminders] Found ${toRemind.length} job seekers below ${COMPLETION_THRESHOLD}% completion`
    );

    let sent = 0;
    let failed = 0;
    for (const user of toRemind) {
      try {
        const res = await fetch(`${baseUrl}/api/auth/send-profile-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            firstName: user.firstName,
          }),
        });
        if (res.ok) sent++;
        else {
          failed++;
          console.warn(
            `[cron/profile-reminders] Failed to send to ${user.email}: ${res.status}`
          );
        }
      } catch (err) {
        failed++;
        console.error(
          `[cron/profile-reminders] Error sending to ${user.email}:`,
          err
        );
      }
    }

    console.log(
      `[cron/profile-reminders] Done. Sent=${sent} Failed=${failed}`
    );
    return NextResponse.json({
      success: true,
      eligible: toRemind.length,
      sent,
      failed,
    });
  } catch (error: any) {
    console.error('[cron/profile-reminders] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron failed' },
      { status: 500 }
    );
  }
}
