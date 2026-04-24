/**
 * Offline checks for recruiter-style matching (no Firestore).
 * Run: npx tsx scripts/test-matching-scenarios.ts
 */
import { scoreCandidateAgainstJob, type JobForScoring } from '@/lib/matching/scoring';
import { normalizeCandidateForMatching } from '@/lib/matching/normalize-candidate';

function fashionJob(): JobForScoring {
  return {
    title: 'Fashion Designer',
    normalizedTitle: 'Fashion Designer',
    canonicalRole: 'fashion_designer',
    roleFamily: 'design',
    roleSpecialization: 'fashion_apparel',
    requiredSkills: ['Illustrator', 'Technical flats', 'Apparel construction'],
    preferredSkills: ['CLO 3D'],
    softRequirements: [],
    hardRequirements: ['BFA in Fashion Design'],
    requiredTools: ['illustrator', 'photoshop'],
    domainKeywords: ['garment', 'textiles', 'runway'],
    anchorSkills: ['fashion design', 'apparel design', 'illustrator', 'garment construction'],
    keywords: [],
    locationCity: 'New York',
    locationState: 'NY',
    minGpaNumeric: null,
    industry: 'Retail',
    employment: 'FULL_TIME',
    jobType: 'FULL_TIME',
    sponsorshipAccepted: null,
  };
}

function financeJob(): JobForScoring {
  return {
    title: 'Financial Analyst',
    normalizedTitle: 'Financial Analyst',
    canonicalRole: 'financial_analyst',
    roleFamily: 'finance',
    roleSpecialization: 'fpna',
    requiredSkills: ['Financial modeling', 'Excel', 'Forecasting'],
    preferredSkills: [],
    softRequirements: [],
    hardRequirements: [],
    anchorSkills: ['financial modeling', 'dcf', 'excel', 'variance analysis'],
    domainKeywords: ['budget', 'p&l'],
    keywords: [],
    locationCity: 'Boston',
    locationState: 'MA',
    minGpaNumeric: 3.4,
    industry: 'Finance',
    employment: 'FULL_TIME',
    jobType: 'FULL_TIME',
    sponsorshipAccepted: true,
  };
}

function candidateUx(): Record<string, unknown> {
  return {
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'a@example.com',
    role: 'JOB_SEEKER',
    headline: 'Product Designer focused on mobile apps',
    targetRolesV2: ['Product Designer', 'UX Designer'],
    skills: ['Figma', 'User research', 'Prototyping'],
    experience: 'Designed onboarding flows for a consumer fintech app.',
    careerInterests: ['Technology'],
    jobTypes: ['FULL_TIME'],
    locations: ['New York, NY'],
    gpa: '3.6',
  };
}

function candidateSwe(): Record<string, unknown> {
  return {
    firstName: 'Sam',
    lastName: 'Code',
    email: 's@example.com',
    role: 'JOB_SEEKER',
    headline: 'Software Engineer — backend & APIs',
    targetRolesV2: ['Software Engineer'],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    experience: 'Built microservices and REST APIs for e-commerce.',
    careerInterests: ['Technology'],
    jobTypes: ['FULL_TIME'],
    locations: ['New York, NY'],
    gpa: '3.5',
  };
}

function candidateFinance(): Record<string, unknown> {
  return {
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'j@example.com',
    role: 'JOB_SEEKER',
    headline: 'Financial Analyst | FP&A',
    targetRolesV2: ['Financial Analyst'],
    skills: ['Excel', 'Financial modeling', 'Forecasting'],
    experience: 'Built three-statement models and monthly variance analysis for SaaS.',
    careerInterests: ['Finance'],
    jobTypes: ['FULL_TIME'],
    locations: ['Boston, MA'],
    gpa: '3.7',
  };
}

function candidateBarista(): Record<string, unknown> {
  return {
    firstName: 'Casey',
    lastName: 'Brew',
    email: 'c@example.com',
    role: 'JOB_SEEKER',
    headline: 'Cafe lead and customer experience',
    targetRolesV2: ['Shift Supervisor'],
    skills: ['Customer service', 'Inventory'],
    experience: 'Managed daily operations for a high-volume cafe.',
    careerInterests: ['Hospitality'],
    jobTypes: ['FULL_TIME'],
    locations: ['Seattle, WA'],
    gpa: '3.2',
  };
}

function run(label: string, job: JobForScoring, raw: Record<string, unknown>, semantic: number | null) {
  const n = normalizeCandidateForMatching('c1', raw);
  const s = scoreCandidateAgainstJob(job, n, { semanticScore: semantic });
  console.log(`\n--- ${label} ---`);
  console.log('overall', s.overallScore, 'title', s.titleScore, 'anchors', s.anchorSkillScore, 'skills', s.skillsScore);
  console.log('industry', s.industryScore, 'gpa', s.gpaScore, 'elig', s.debug.eligibility?.eligibilityStatus);
  console.log('caps', s.debug.scoreCapsApplied);
}

console.log('Scenario 1: Fashion job vs UX vs SWE (semantic inflated to 95 for SWE)');
run('Fashion vs UX', fashionJob(), candidateUx(), 72);
run('Fashion vs SWE', fashionJob(), candidateSwe(), 95);

console.log('\nScenario 2: Financial Analyst vs finance vs unrelated');
run('FA vs finance', financeJob(), candidateFinance(), 70);
run('FA vs unrelated', financeJob(), candidateBarista(), 88);

console.log('\nScenario 3: Generic job (generalist) vs SWE');
const genericJob: JobForScoring = {
  title: 'Summer Intern',
  normalizedTitle: 'Intern',
  canonicalRole: 'generalist',
  roleFamily: 'general',
  roleSpecialization: 'general',
  requiredSkills: ['Communication', 'Microsoft Office'],
  preferredSkills: [],
  softRequirements: [],
  hardRequirements: [],
  keywords: ['intern'],
  locationCity: '',
  locationState: '',
  minGpaNumeric: null,
  industry: null,
  employment: 'INTERNSHIP',
  jobType: 'INTERNSHIP',
};
run('Generalist vs SWE', genericJob, candidateSwe(), 80);
