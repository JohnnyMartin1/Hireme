import { z } from 'zod';

// Auth schemas
export const signupSeekerSchema = z.object({
  role: z.literal('JOB_SEEKER'),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const signupEmployerSchema = z.object({
  role: z.literal('EMPLOYER'),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Profile schemas
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
  degreeType: z.enum(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELORS', 'MASTERS', 'MBA', 'PHD', 'BOOTCAMP', 'OTHER']).optional(),
  major: z.string().optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  school: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  interests: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  workModes: z.array(z.enum(['ONSITE', 'HYBRID', 'REMOTE'])).optional(),
  workAuth: z.array(z.string()).optional(),
  openToOpp: z.boolean().optional(),
});

// Employer schemas
export const employerUpdateSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  description: z.string().optional(),
  hiringRoles: z.array(z.string()).optional(),
});

// Message schemas
export const messageCreateSchema = z.object({
  body: z.string().min(1).max(1000),
});

// Upload schemas
export const uploadPresignSchema = z.object({
  type: z.enum(['resume', 'video']),
  contentType: z.string(),
});

export const uploadCompleteSchema = z.object({
  key: z.string(),
  field: z.enum(['resumeUrl', 'videoUrl']),
});

// Email verification
export const emailVerifySchema = z.object({
  token: z.string().min(1),
});

// Type exports
export type SignupSeekerInput = z.infer<typeof signupSeekerSchema>;
export type SignupEmployerInput = z.infer<typeof signupEmployerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type EmployerUpdateInput = z.infer<typeof employerUpdateSchema>;
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;
export type UploadPresignInput = z.infer<typeof uploadPresignSchema>;
export type UploadCompleteInput = z.infer<typeof uploadCompleteSchema>;
export type EmailVerifyInput = z.infer<typeof emailVerifySchema>;
