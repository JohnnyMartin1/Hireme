// types/user.ts
// Central UserProfile type used across the app.
// Add fields here as your app grows.

export interface UserProfile {
  // Common identity fields
  id?: string | null;
  name?: string | null;
  email?: string | null;

  // Company profile fields used on /account/company
  companyWebsite?: string | null;
  companySize?: string | null;
  companyIndustry?: string | null;
  companyFounded?: string | null;
  bannerImageUrl?: string | null;
  logoImageUrl?: string | null;

  // Keep this so pages don't explode if we forgot a field somewhere
  [key: string]: any;
}
