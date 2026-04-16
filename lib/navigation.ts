/**
 * Central URL builders for employer/recruiter navigation and job context.
 */

export function getCandidateUrl(candidateId: string, jobId?: string | null): string {
  const base = `/candidate/${candidateId}`;
  if (jobId) return `${base}?jobId=${encodeURIComponent(jobId)}`;
  return base;
}

export function getJobOverviewUrl(jobId: string): string {
  return `/employer/job/${jobId}`;
}

export function getJobMatchesUrl(jobId: string): string {
  return `/employer/job/${jobId}/matches`;
}

export function getJobPipelineUrl(jobId: string): string {
  return `/employer/job/${jobId}/pipeline`;
}

export function getJobEditUrl(jobId: string): string {
  return `/employer/job/${jobId}/edit`;
}

export function getDashboardUrl(): string {
  return "/home/employer";
}

export function getMessagesUrl(jobId?: string | null): string {
  if (jobId) return `/messages?jobId=${encodeURIComponent(jobId)}`;
  return "/messages";
}

export function getEmployerJobsListUrl(): string {
  return "/employer/jobs";
}

export function getCandidatesSearchUrl(): string {
  return "/search/candidates";
}
