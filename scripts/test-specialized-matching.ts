import { scoreCandidateAgainstJob, type JobForScoring } from '@/lib/matching/scoring';
import { normalizeCandidateForMatching } from '@/lib/matching/normalize-candidate';

function makeCandidate(id: string, data: Record<string, unknown>) {
  return normalizeCandidateForMatching(id, {
    firstName: 'Test',
    lastName: id,
    email: `${id}@example.com`,
    ...data,
  });
}

const fashionJob: JobForScoring = {
  title: 'Fashion Designer',
  normalizedTitle: 'Fashion Designer',
  canonicalRole: 'fashion_designer',
  roleFamily: 'design',
  roleSpecialization: 'fashion_apparel',
  hardRequirements: ['fashion design', 'garment design', 'portfolio'],
  softRequirements: ['trend analysis'],
  requiredSkills: ['fashion design', 'garment construction', 'technical sketching'],
  preferredSkills: ['trend analysis', 'textiles'],
  requiredTools: ['adobe illustrator', 'photoshop'],
  domainKeywords: ['fashion', 'apparel', 'garment', 'textiles', 'fabrics'],
  experienceRequirements: ['2+ years fashion design experience'],
  educationRequirements: ['fashion design degree preferred'],
  keywords: ['fashion', 'apparel', 'garment'],
  locationCity: 'New York',
  locationState: 'NY',
  workMode: 'IN_PERSON',
  employment: 'FULL_TIME',
  jobType: 'FULL_TIME',
  minGpaNumeric: null,
  industry: 'fashion',
  requiredCareerInterests: ['fashion'],
};

const softwareCandidate = makeCandidate('software-dev', {
  headline: 'Software Engineer',
  targetRolesV2: ['Software Engineer'],
  skills: ['typescript', 'react', 'node', 'aws'],
  experience:
    'Built microservices, APIs, and frontend dashboards. Maintained CI/CD and cloud infrastructure.',
  location: 'New York, NY',
  resumeUrl: 'https://example.com/resume.pdf',
});

const productCandidate = makeCandidate('product-designer', {
  headline: 'Product Designer',
  targetRolesV2: ['Product Designer', 'UX Designer'],
  skills: ['figma', 'user research', 'design systems', 'photoshop'],
  experience:
    'Designed mobile apps and SaaS workflows. Created case studies and portfolio with user interviews.',
  location: 'New York, NY',
  resumeUrl: 'https://example.com/resume.pdf',
});

const fashionCandidate = makeCandidate('fashion-designer', {
  headline: 'Fashion Designer',
  targetRolesV2: ['Fashion Designer'],
  skills: ['fashion design', 'garment construction', 'adobe illustrator', 'photoshop', 'textiles'],
  experience:
    'Fashion Design Intern and Assistant Fashion Designer. Built seasonal apparel lines, technical sketches, and manufacturer handoff packs. Portfolio includes garments, fit sessions, and trims.',
  careerInterests: ['fashion', 'apparel'],
  location: 'New York, NY',
  resumeUrl: 'https://example.com/resume.pdf',
});

const sA = scoreCandidateAgainstJob(fashionJob, softwareCandidate);
const sB = scoreCandidateAgainstJob(fashionJob, productCandidate);
const sC = scoreCandidateAgainstJob(fashionJob, fashionCandidate);

console.log('A. Fashion Designer vs Software Developer =>', sA.overallScore, sA.debug);
console.log('B. Fashion Designer vs Product Designer   =>', sB.overallScore, sB.debug);
console.log('C. Fashion Designer vs Fashion Designer   =>', sC.overallScore, sC.debug);

if (!(sA.overallScore < sB.overallScore && sB.overallScore < sC.overallScore)) {
  throw new Error('Specialized ranking order failed (expected A < B < C)');
}

console.log('Specialized matching test passed.');

