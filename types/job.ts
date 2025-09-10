// types/job.ts
export interface Job {
  id?: string | null;
  employerId?: string | null;
  title?: string | null;
  description?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  employment?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE' | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  tags?: string[] | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | null;
  createdAt?: Date | any | null; // Firebase timestamp or Date
  updatedAt?: Date | any | null; // Firebase timestamp or Date
  isActive?: boolean | null;
  
  // Keep this for flexible field access
  [key: string]: any;
}
