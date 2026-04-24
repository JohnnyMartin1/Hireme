import { normalizeWhitespaceLower } from '@/lib/matching/normalize-terms';

export type RoleDistance = 'HIGH' | 'MEDIUM_HIGH' | 'MEDIUM' | 'LOW';

export type CanonicalRoleConfig = {
  family: string;
  specialization: string;
  aliases: string[];
};

export const ROLE_TAXONOMY: Record<string, CanonicalRoleConfig> = {
  fashion_designer: {
    family: 'design',
    specialization: 'fashion_apparel',
    aliases: [
      'fashion designer',
      'apparel designer',
      'garment designer',
      'textile designer',
      'technical designer apparel',
    ],
  },
  product_designer: {
    family: 'design',
    specialization: 'product_uiux',
    aliases: ['product designer', 'digital product designer', 'interaction designer'],
  },
  ux_designer: {
    family: 'design',
    specialization: 'product_uiux',
    aliases: ['ux designer', 'ui ux designer', 'user experience designer', 'experience designer'],
  },
  ui_designer: {
    family: 'design',
    specialization: 'product_uiux',
    aliases: ['ui designer', 'user interface designer', 'visual ui'],
  },
  graphic_designer: {
    family: 'design',
    specialization: 'graphic_visual',
    aliases: ['graphic designer', 'visual designer', 'brand designer', 'creative designer'],
  },
  software_engineer: {
    family: 'engineering',
    specialization: 'software',
    aliases: [
      'software engineer',
      'software developer',
      'full stack engineer',
      'frontend engineer',
      'backend engineer',
      'web developer',
      'mobile developer',
    ],
  },
  data_analyst: {
    family: 'data',
    specialization: 'analytics_bi',
    aliases: ['data analyst', 'business intelligence', 'bi analyst', 'reporting analyst'],
  },
  data_scientist: {
    family: 'data',
    specialization: 'ml_ds',
    aliases: ['data scientist', 'machine learning engineer', 'ml engineer', 'applied scientist'],
  },
  financial_analyst: {
    family: 'finance',
    specialization: 'fpna',
    aliases: [
      'financial analyst',
      'fp&a',
      'fpna',
      'finance analyst',
      'corporate finance analyst',
      'equity research',
    ],
  },
  accountant: {
    family: 'finance',
    specialization: 'accounting',
    aliases: ['accountant', 'staff accountant', 'accounting analyst', 'cpa'],
  },
  marketing: {
    family: 'marketing',
    specialization: 'growth_brand',
    aliases: ['marketing manager', 'growth marketer', 'digital marketing', 'brand marketing', 'demand generation'],
  },
  sales: {
    family: 'sales',
    specialization: 'b2b_sales',
    aliases: ['sales', 'account executive', 'business development representative', 'account manager'],
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
      ['adobe illustrator', 'illustrator', 'photoshop', 'technical sketching', 'technical flats'],
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
    adjacentRoles: ['graphic_designer', 'product_designer', 'ux_designer'],
    unrelatedRoles: ['software_engineer', 'data_scientist', 'data_analyst', 'financial_analyst', 'accountant', 'sales'],
  },
  financial_analyst: {
    mustHaveAny: [
      ['financial modeling', 'dcf', 'valuation'],
      ['excel', 'budget', 'forecast'],
    ],
    strongSignals: [
      'financial statements',
      'variance analysis',
      'p&l',
      'market research',
      'investment banking',
      'corporate finance',
    ],
    adjacentRoles: ['accountant', 'data_analyst'],
    unrelatedRoles: [
      'software_engineer',
      'fashion_designer',
      'ux_designer',
      'product_designer',
      'graphic_designer',
      'sales',
    ],
  },
  software_engineer: {
    mustHaveAny: [['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'react', 'node']],
    strongSignals: ['api', 'git', 'ci/cd', 'kubernetes', 'aws', 'sql', 'testing', 'agile'],
    adjacentRoles: ['data_scientist', 'data_analyst'],
    unrelatedRoles: ['fashion_designer', 'financial_analyst', 'ux_designer', 'graphic_designer', 'sales'],
  },
  data_analyst: {
    mustHaveAny: [['sql', 'tableau', 'power bi', 'looker', 'python', 'excel']],
    strongSignals: ['dashboard', 'etl', 'metrics', 'reporting', 'visualization'],
    adjacentRoles: ['data_scientist', 'software_engineer', 'financial_analyst'],
    unrelatedRoles: ['fashion_designer', 'ux_designer', 'graphic_designer'],
  },
  data_scientist: {
    mustHaveAny: [['python', 'machine learning', 'ml ', 'statistics', 'modeling']],
    strongSignals: ['tensorflow', 'pytorch', 'nlp', 'experiment', 'feature engineering'],
    adjacentRoles: ['data_analyst', 'software_engineer'],
    unrelatedRoles: ['fashion_designer', 'graphic_designer', 'sales'],
  },
  product_designer: {
    mustHaveAny: [['figma', 'sketch', 'prototype', 'wireframe', 'user research']],
    strongSignals: ['design system', 'usability', 'journey map', 'interaction'],
    adjacentRoles: ['ux_designer', 'ui_designer', 'graphic_designer'],
    unrelatedRoles: ['software_engineer', 'financial_analyst', 'fashion_designer', 'data_analyst'],
  },
  ux_designer: {
    mustHaveAny: [['figma', 'user research', 'usability', 'wireframe']],
    strongSignals: ['prototype', 'ia', 'accessibility', 'journey'],
    adjacentRoles: ['product_designer', 'ui_designer', 'graphic_designer'],
    unrelatedRoles: ['software_engineer', 'financial_analyst', 'fashion_designer', 'data_analyst'],
  },
  graphic_designer: {
    mustHaveAny: [['illustrator', 'photoshop', 'indesign', 'brand', 'layout']],
    strongSignals: ['typography', 'print', 'visual identity'],
    adjacentRoles: ['ux_designer', 'product_designer', 'fashion_designer'],
    unrelatedRoles: ['software_engineer', 'financial_analyst', 'data_scientist'],
  },
};

function norm(s: string): string {
  return normalizeWhitespaceLower(s || '');
}

function sortedTaxonomyEntries(): Array<[string, CanonicalRoleConfig]> {
  return Object.entries(ROLE_TAXONOMY).sort((a, b) => {
    const maxA = Math.max(0, ...a[1].aliases.map((x) => x.length));
    const maxB = Math.max(0, ...b[1].aliases.map((x) => x.length));
    if (maxB !== maxA) return maxB - maxA;
    return b[1].aliases.length - a[1].aliases.length;
  });
}

/**
 * Classify free text to the best canonical role using longest-alias-first matching
 * so specific titles (e.g. "fashion designer") beat generic "designer" overlap.
 */
export function classifyRole(text: string): {
  canonicalRole: string;
  roleFamily: string;
  roleSpecialization: string;
} {
  const t = norm(text);
  if (!t.trim()) {
    return { canonicalRole: 'generalist', roleFamily: 'general', roleSpecialization: 'general' };
  }

  let bestRole = 'generalist';
  let bestWeight = 0;

  for (const [roleKey, config] of sortedTaxonomyEntries()) {
    const aliases = [...config.aliases].sort((a, b) => norm(b).length - norm(a).length);
    for (const alias of aliases) {
      const a = norm(alias);
      if (a.length < 4) continue;
      if (t.includes(a)) {
        const w = a.length * 10 + (roleKey.includes('designer') || roleKey.includes('engineer') ? 2 : 0);
        if (w > bestWeight) {
          bestWeight = w;
          bestRole = roleKey;
        }
      }
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

  if (!j || jobRole === 'generalist') {
    return { distance: 'HIGH', score: 72, reason: 'generic-or-unmapped-job' };
  }
  if (!c || candidateRole === 'generalist') {
    return { distance: 'MEDIUM', score: 44, reason: 'candidate-role-underdetermined' };
  }
  if (j.specialization === c.specialization) {
    return { distance: 'HIGH', score: 100, reason: 'same-specialization' };
  }

  const jobCfg = SPECIALIZED_ROLE_CONFIG[jobRole];
  if (jobCfg?.adjacentRoles.includes(candidateRole)) {
    return { distance: 'MEDIUM_HIGH', score: 74, reason: 'adjacent-canonical-role' };
  }

  if (j.family === c.family) {
    return { distance: 'MEDIUM', score: 48, reason: 'same-family-different-specialization' };
  }

  return { distance: 'LOW', score: 18, reason: 'different-family' };
}

export function detectRoleFromCandidateText(candidateText: string): string {
  return classifyRole(candidateText).canonicalRole;
}

/**
 * Stricter role detection: identity-heavy text (headline + targets) before resume noise.
 */
export function detectRoleFromIdentityText(candidateText: string): string {
  return classifyRole(candidateText).canonicalRole;
}
