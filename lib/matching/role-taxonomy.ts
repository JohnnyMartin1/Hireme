import { normalizeWhitespaceLower } from '@/lib/matching/normalize-terms';

export type RoleDistance = 'HIGH' | 'MEDIUM' | 'LOW';

export type CanonicalRoleConfig = {
  family: string;
  specialization: string;
  aliases: string[];
};

export const ROLE_TAXONOMY: Record<string, CanonicalRoleConfig> = {
  fashion_designer: {
    family: 'design',
    specialization: 'fashion_apparel',
    aliases: ['fashion designer', 'apparel designer', 'garment designer', 'textile designer'],
  },
  product_designer: {
    family: 'design',
    specialization: 'product_uiux',
    aliases: ['product designer', 'ux designer', 'ui designer', 'interaction designer'],
  },
  graphic_designer: {
    family: 'design',
    specialization: 'graphic_visual',
    aliases: ['graphic designer', 'visual designer', 'brand designer'],
  },
  ux_designer: {
    family: 'design',
    specialization: 'product_uiux',
    aliases: ['ux designer', 'ui ux designer', 'user experience designer'],
  },
  software_engineer: {
    family: 'engineering',
    specialization: 'software',
    aliases: ['software engineer', 'software developer', 'full stack engineer', 'frontend engineer', 'backend engineer'],
  },
  accountant: {
    family: 'finance',
    specialization: 'accounting',
    aliases: ['accountant', 'staff accountant', 'accounting analyst'],
  },
  sales: {
    family: 'sales',
    specialization: 'b2b_sales',
    aliases: ['sales', 'account executive', 'business development representative'],
  },
};

export const SPECIALIZED_ROLE_CONFIG: Record<
  string,
  {
    mustHaveAny: string[][];
    strongSignals: string[];
    adjacentRoles: string[];
    unrelatedRoles: string[];
  }
> = {
  fashion_designer: {
    mustHaveAny: [
      ['fashion design', 'apparel design', 'garment design'],
      ['adobe illustrator', 'illustrator', 'photoshop', 'technical sketching'],
    ],
    strongSignals: [
      'textiles',
      'garment construction',
      'fit',
      'portfolio',
      'manufacturer',
      'production',
      'trend analysis',
      'fabrics',
      'trims',
    ],
    adjacentRoles: ['product_designer', 'graphic_designer', 'ux_designer'],
    unrelatedRoles: ['software_engineer', 'accountant', 'sales'],
  },
};

function norm(s: string): string {
  return normalizeWhitespaceLower(s || '');
}

export function classifyRole(text: string): {
  canonicalRole: string;
  roleFamily: string;
  roleSpecialization: string;
} {
  const t = norm(text);
  let bestRole = 'generalist';
  let bestHits = 0;

  for (const [role, config] of Object.entries(ROLE_TAXONOMY)) {
    const hits = config.aliases.reduce((acc, alias) => (t.includes(norm(alias)) ? acc + 1 : acc), 0);
    if (hits > bestHits) {
      bestHits = hits;
      bestRole = role;
    }
  }

  if (bestRole === 'generalist') {
    return {
      canonicalRole: 'generalist',
      roleFamily: 'general',
      roleSpecialization: 'general',
    };
  }
  const picked = ROLE_TAXONOMY[bestRole];
  return {
    canonicalRole: bestRole,
    roleFamily: picked.family,
    roleSpecialization: picked.specialization,
  };
}

export function resolveCanonicalRoleKey(
  primary: string | null | undefined,
  fallbackText?: string
): { canonicalRole: string; roleFamily: string; roleSpecialization: string } {
  const p = norm(primary || '').replace(/\s+/g, '_');
  if (p && ROLE_TAXONOMY[p]) {
    return {
      canonicalRole: p,
      roleFamily: ROLE_TAXONOMY[p].family,
      roleSpecialization: ROLE_TAXONOMY[p].specialization,
    };
  }
  const fromPrimary = classifyRole(String(primary || ''));
  if (fromPrimary.canonicalRole !== 'generalist') return fromPrimary;
  return classifyRole(String(fallbackText || ''));
}

export function getRoleDistance(jobRole: string, candidateRole: string): {
  distance: RoleDistance;
  score: number;
  reason: string;
} {
  const j = ROLE_TAXONOMY[jobRole];
  const c = ROLE_TAXONOMY[candidateRole];
  if (!j || !c) {
    return { distance: 'LOW', score: 30, reason: 'unknown-role-taxonomy' };
  }
  if (j.specialization === c.specialization) {
    return { distance: 'HIGH', score: 100, reason: 'same-specialization' };
  }
  if (j.family === c.family) {
    return { distance: 'MEDIUM', score: 62, reason: 'same-family-different-specialization' };
  }
  return { distance: 'LOW', score: 20, reason: 'different-family' };
}

export function detectRoleFromCandidateText(candidateText: string): string {
  return classifyRole(candidateText).canonicalRole;
}

