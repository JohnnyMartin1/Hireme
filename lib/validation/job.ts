import { z } from 'zod';

/** Server-side validation for creating/updating a job (API body). */
export const createJobBodySchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(20000),
  locationCity: z.string().trim().max(120).optional().default(''),
  locationState: z.string().trim().max(120).optional().default(''),
  /** Combined display location e.g. "New York, NY" */
  location: z.string().trim().max(240).optional().nullable(),
  employment: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'])
    .optional()
    .default('FULL_TIME'),
  jobType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'])
    .optional(),
  workMode: z.enum(['IN_PERSON', 'HYBRID', 'REMOTE']).optional().nullable(),
  salaryMin: z.number().min(0).max(1_000_000_000).nullable().optional(),
  salaryMax: z.number().min(0).max(1_000_000_000).nullable().optional(),
  tags: z.array(z.string().trim().max(80)).max(40).optional().default([]),
  requiredGpa: z.string().trim().max(20).optional().nullable(),
  minGpa: z.string().trim().max(20).optional().nullable(),
  requiredCareerInterests: z.array(z.string().trim().max(120)).max(10).optional().default([]),
  industry: z.string().trim().max(120).optional().nullable(),
  experienceLevel: z.string().trim().max(80).optional().nullable(),
  functionalArea: z.string().trim().max(120).optional().nullable(),
  requiredSkillsStructured: z.array(z.string().trim().max(100)).max(30).optional().default([]),
  preferredSkillsStructured: z.array(z.string().trim().max(100)).max(30).optional().default([]),
  requiredMajors: z.array(z.string().trim().max(100)).max(20).optional().default([]),
  preferredMajors: z.array(z.string().trim().max(100)).max(20).optional().default([]),
  sponsorshipAccepted: z.boolean().optional().nullable(),
  relocationAccepted: z.boolean().optional().nullable(),
  employerId: z.string().min(1),
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  companyWebsite: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'CLOSED', 'INACTIVE']).optional().default('ACTIVE'),
  idToken: z.string().min(10, 'Authentication required'),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;
