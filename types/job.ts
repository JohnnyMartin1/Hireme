// types/job.ts
export interface Job {
  id?: string | null;
  employerId?: string | null;
  title?: string | null;
  description?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  employment?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  tags?: string[] | null;
  status?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  
  // Keep this so pages don't explode if we forgot a field somewhere
  [key: string]: any;
}
