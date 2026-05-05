import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  calculateCompletion,
  hasIntroVideoForCompletion,
  hasProfileImageForCompletion,
  hasResumeForCompletion,
  hasTranscriptForCompletion,
} from "@/lib/profile-completion";

/** Fields safe for employer discovery / endorse preview (no private email/phone/tokens). */
export function buildPublicCandidateProfilePayload(
  candidateId: string,
  userData: Record<string, unknown>
): Record<string, unknown> {
  const skills = Array.isArray(userData.skills) ? userData.skills : [];
  const careerInterests = Array.isArray(userData.careerInterests)
    ? userData.careerInterests
    : Array.isArray(userData.requiredCareerInterests)
      ? userData.requiredCareerInterests
      : [];
  const completion = calculateCompletion(userData);
  return {
    candidateId,
    role: "JOB_SEEKER",
    firstName: userData.firstName ?? "",
    lastName: userData.lastName ?? "",
    headline: userData.headline ?? "",
    school: userData.school ?? "",
    major: userData.major ?? "",
    graduationYear: userData.graduationYear ?? null,
    skills,
    careerInterests,
    location: userData.location ?? "",
    locationCity: userData.locationCity ?? "",
    locationState: userData.locationState ?? "",
    openToOpportunities: userData.openToOpportunities ?? null,
    // Intentionally omit workAuthorization from public discovery (minimization).
    hasResume: hasResumeForCompletion(userData),
    hasTranscript: hasTranscriptForCompletion(userData),
    hasIntroVideo: hasIntroVideoForCompletion(userData),
    hasVideo: hasIntroVideoForCompletion(userData),
    hasProfileImage: hasProfileImageForCompletion(userData),
    profileImageUrl: userData.profileImageUrl ?? "",
    profileCompletionPercent: completion,
    // Used by employer search filters + completion fallback (no email/phone here).
    education: userData.education ?? [],
    gpa: userData.gpa ?? null,
    minGpa: userData.minGpa ?? null,
    bio: userData.bio ?? "",
    professionalSummaryV2: userData.professionalSummaryV2 ?? null,
    targetRolesV2: userData.targetRolesV2 ?? [],
    skillsV2: userData.skillsV2 ?? [],
    locations: userData.locations ?? [],
    workPreferences: userData.workPreferences ?? [],
    jobTypes: userData.jobTypes ?? [],
    experience:
      typeof userData.experience === "string"
        ? String(userData.experience).slice(0, 4000)
        : userData.experience ?? null,
    experienceProjectsV2: userData.experienceProjectsV2 ?? [],
    extracurriculars: userData.extracurriculars ?? [],
    certifications: userData.certifications ?? [],
    languages: userData.languages ?? [],
    endorsementCount: userData.endorsementCount ?? 0,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function syncPublicCandidateProfile(adminDb: Firestore, candidateId: string): Promise<void> {
  const snap = await adminDb.collection("users").doc(candidateId).get();
  if (!snap.exists) {
    await adminDb.collection("publicCandidateProfiles").doc(candidateId).delete().catch(() => {});
    return;
  }
  const d = snap.data() as Record<string, unknown>;
  if (String(d.role || "") !== "JOB_SEEKER") {
    await adminDb.collection("publicCandidateProfiles").doc(candidateId).delete().catch(() => {});
    return;
  }
  await adminDb
    .collection("publicCandidateProfiles")
    .doc(candidateId)
    .set(buildPublicCandidateProfilePayload(candidateId, d), { merge: true });
}

export function buildPublicJobPayload(jobId: string, job: Record<string, unknown>): Record<string, unknown> {
  return {
    jobId,
    title: job.title ?? "",
    companyName: job.companyName ?? "",
    location: job.location ?? "",
    locationCity: job.locationCity ?? "",
    locationState: job.locationState ?? "",
    employmentType: job.employment ?? job.jobType ?? "",
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    description: job.description ?? "",
    status: job.status ?? "",
    visibility: job.visibility ?? "",
    postedAt: job.postedDate ?? job.postedAt ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function syncPublicJobProjection(adminDb: Firestore, jobId: string): Promise<void> {
  const snap = await adminDb.collection("jobs").doc(jobId).get();
  if (!snap.exists) {
    await adminDb.collection("publicJobs").doc(jobId).delete().catch(() => {});
    return;
  }
  const j = snap.data() as Record<string, unknown>;
  const status = String(j.status || "");
  const visibility = String(j.visibility || "");
  const isPublicish = status === "ACTIVE" || visibility === "PUBLIC";
  if (!isPublicish) {
    await adminDb.collection("publicJobs").doc(jobId).delete().catch(() => {});
    return;
  }
  await adminDb.collection("publicJobs").doc(jobId).set(buildPublicJobPayload(jobId, j), { merge: true });
}
