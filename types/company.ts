export interface Company {
  id: string;
  companyName: string;
  companyBio?: string;
  companyLocation?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  companyFounded?: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  createdAt: string;
  createdBy: string; // User ID of the company owner
}

export interface CompanyInvitation {
  id: string;
  companyId: string;
  invitedEmail: string;
  invitedBy: string; // User ID of the inviter
  role: 'RECRUITER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
  declinedAt?: string;
}

export type UserRole = 'JOB_SEEKER' | 'EMPLOYER' | 'RECRUITER';

