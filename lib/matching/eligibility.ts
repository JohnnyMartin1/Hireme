import type { RoleDistance } from '@/lib/matching/role-taxonomy';
import { SPECIALIZED_ROLE_CONFIG } from '@/lib/matching/role-taxonomy';
import type { AnchorCoverageResult } from '@/lib/matching/anchor-skills';

export type EligibilityStatus = 'eligible' | 'borderline' | 'weak_domain_fit';

export type MatchEligibilityResult = {
  eligibilityStatus: EligibilityStatus;
  roleFamilyFit: number;
  specializationFit: number;
  anchorSkillFit: number;
  gatingPenalties: string[];
  gatingReasons: string[];
};

export function evaluateMatchEligibility(input: {
  jobCanonicalRole: string;
  roleDistance: RoleDistance;
  specializationAlignmentScore: number;
  anchorCoverage: AnchorCoverageResult;
  sponsorshipHardBlock: boolean;
  minGpaHardFail: boolean;
}): MatchEligibilityResult {
  const gatingPenalties: string[] = [];
  const gatingReasons: string[] = [];

  const specialized = Boolean(SPECIALIZED_ROLE_CONFIG[input.jobCanonicalRole]);
  const specFit = input.specializationAlignmentScore;
  const anchorFit = input.anchorCoverage.score;

  let roleFamilyFit = 55;
  if (input.roleDistance === 'HIGH') roleFamilyFit = 92;
  else if (input.roleDistance === 'MEDIUM_HIGH') roleFamilyFit = 78;
  else if (input.roleDistance === 'MEDIUM') roleFamilyFit = 52;
  else if (input.roleDistance === 'LOW') roleFamilyFit = 22;
  else roleFamilyFit = 35;

  if (input.sponsorshipHardBlock) {
    gatingPenalties.push('sponsorship-not-accepted');
    gatingReasons.push('Job does not sponsor visas but candidate requires sponsorship.');
  }
  if (input.minGpaHardFail) {
    gatingPenalties.push('below-minimum-gpa');
    gatingReasons.push('Candidate GPA is below the job minimum when GPA is available.');
  }

  let status: EligibilityStatus = 'eligible';

  if (input.sponsorshipHardBlock || input.minGpaHardFail) {
    status = 'borderline';
  }

  if (specialized) {
    if (input.roleDistance === 'LOW' && anchorFit < 35) {
      status = 'weak_domain_fit';
      gatingReasons.push('Specialized role: candidate domain and anchor signals are far from the job.');
    } else if (input.roleDistance === 'LOW' && anchorFit < 55) {
      status = 'borderline';
      gatingReasons.push('Specialized role: weak role family match with limited anchor overlap.');
    } else if (anchorFit < 22 && input.roleDistance !== 'HIGH') {
      if (status === 'eligible') status = 'borderline';
      gatingReasons.push('Very few domain anchor skills detected in the candidate profile.');
    }
  } else {
    if (input.roleDistance === 'LOW' && anchorFit < 15) {
      status = 'borderline';
      gatingReasons.push('Broad role: low anchor overlap and different role family.');
    }
  }

  if (specialized && input.roleDistance === 'LOW' && anchorFit >= 55 && status !== 'weak_domain_fit') {
    status = 'borderline';
    gatingReasons.push('Role family mismatch but some domain anchors matched — treat as exploratory fit.');
  }

  return {
    eligibilityStatus: status,
    roleFamilyFit,
    specializationFit: specFit,
    anchorSkillFit: anchorFit,
    gatingPenalties,
    gatingReasons,
  };
}
