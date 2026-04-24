import type { ProcessedJobContent } from '@/types/matching';
import {
  dedupeSkillList,
  normalizeKeywordList,
  normalizeWhitespaceLower,
  cleanSkillPhrase,
  stripPunctuationEdges,
} from '@/lib/matching/normalize-terms';
import { expandTitleMatchSignals } from '@/lib/matching/title-roles';
import { classifyRole, SPECIALIZED_ROLE_CONFIG, resolveCanonicalRoleKey } from '@/lib/matching/role-taxonomy';
import { isGenericAnchorToken } from '@/lib/matching/anchor-skills';

type ParseInput = {
  title: string;
  description: string;
  tags: string[];
  location?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  jobType?: string | null;
  minGpa?: string | null;
  industry?: string | null;
  experienceLevel?: string | null;
  requiredMajors?: string[];
  preferredMajors?: string[];
  sponsorshipAccepted?: boolean | null;
  relocationAccepted?: boolean | null;
  functionalArea?: string | null;
  requiredSkillsStructured?: string[];
  preferredSkillsStructured?: string[];
};
export type JobParseSource = 'openai' | 'heuristic' | 'failed';
export type JobParseResult = {
  processed: ProcessedJobContent;
  aiProcessingSource: JobParseSource;
};

type OpenAiParsedJobShape = {
  normalizedTitle?: string;
  canonicalRole?: string;
  roleFamily?: string;
  roleSpecialization?: string;
  hardRequirements?: string[];
  softRequirements?: string[];
  requiredTools?: string[];
  domainKeywords?: string[];
  experienceRequirements?: string[];
  educationRequirements?: string[];
  seniorityLevel?: string | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
  keywords?: string[];
  mustHaves?: string[];
  niceToHaves?: string[];
  jobFunctions?: string[];
  functionalArea?: string | null;
  industries?: string[];
  experienceLevel?: string | null;
  requiredMajors?: string[];
  preferredMajors?: string[];
  sponsorshipAccepted?: boolean | null;
  relocationAccepted?: boolean | null;
  locationType?: 'remote' | 'hybrid' | 'onsite' | 'unknown' | null;
  minimumQualifications?: string[];
  roleAliases?: string[];
  aiSummary?: string | null;
  minGpa?: string | null;
  anchorSkills?: string[];
};

const TOOL_HINTS = [
  'adobe illustrator',
  'illustrator',
  'photoshop',
  'indesign',
  'figma',
  'sketch',
  'tableau',
  'excel',
  'sql',
  'python',
];

function parseJobRequirements(
  title: string,
  description: string,
  requiredSkills: string[],
  preferredSkills: string[],
  minimumQualifications: string[]
): {
  hardRequirements: string[];
  softRequirements: string[];
  requiredTools: string[];
  domainKeywords: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
} {
  const lines = `${title}\n${description}`
    .split(/\n|\r/)
    .map((line) => stripPunctuationEdges(line).trim())
    .filter(Boolean);
  const hardRequirements: string[] = [];
  const softRequirements: string[] = [];
  const experienceRequirements: string[] = [];
  const educationRequirements: string[] = [];
  const domainKeywords: string[] = [];

  for (const line of lines.slice(0, 180)) {
    const l = normalizeWhitespaceLower(line);
    if (/(must|required|minimum|need to|requirements)/.test(l)) hardRequirements.push(line);
    if (/(preferred|nice to have|bonus|plus|ideal)/.test(l)) softRequirements.push(line);
    if (/(years|experience|internship|portfolio|worked|production)/.test(l)) {
      experienceRequirements.push(line);
    }
    if (/(bachelor|master|degree|gpa|education|major)/.test(l)) {
      educationRequirements.push(line);
    }
    if (
      /(fashion|apparel|garment|textile|fabrics|trims|fit|pattern|production|manufacturer|trend)/.test(
        l
      )
    ) {
      domainKeywords.push(line);
    }
  }

  const requiredTools = TOOL_HINTS.filter((tool) =>
    normalizeWhitespaceLower(`${title} ${description} ${requiredSkills.join(' ')} ${preferredSkills.join(' ')}`).includes(
      tool
    )
  );

  return {
    hardRequirements: dedupeSkillList([...hardRequirements, ...minimumQualifications]).slice(0, 16),
    softRequirements: dedupeSkillList(softRequirements).slice(0, 16),
    requiredTools: dedupeSkillList(requiredTools).slice(0, 12),
    domainKeywords: dedupeSkillList(domainKeywords).slice(0, 16),
    experienceRequirements: dedupeSkillList(experienceRequirements).slice(0, 12),
    educationRequirements: dedupeSkillList(educationRequirements).slice(0, 12),
  };
}

const SKILL_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'Product Design', re: /\bproduct\s+design\b/i },
  { label: 'Graphic Design', re: /\bgraphic\s+design\b/i },
  { label: 'Visual Design', re: /\bvisual\s+design\b/i },
  { label: 'UX Design', re: /\bux\b|\buser\s+experience\b|\binteraction\s+design\b/i },
  { label: 'UI Design', re: /\bui\b|\buser\s+interface\b/i },
  { label: 'Figma', re: /\bfigma\b/i },
  { label: 'Adobe Illustrator', re: /\billustrator\b/i },
  { label: 'Adobe Photoshop', re: /\bphotoshop\b/i },
  { label: 'Adobe InDesign', re: /\bindesign\b/i },
  { label: 'JavaScript', re: /\bjavascript\b|\bjs\b(?![a-z])/i },
  { label: 'TypeScript', re: /\btypescript\b|\bts\b(?=\s|,|\.|$)/i },
  { label: 'React', re: /\breact\b/i },
  { label: 'Node.js', re: /\bnode\.?js\b/i },
  { label: 'Python', re: /\bpython\b/i },
  { label: 'SQL', re: /\bsql\b/i },
  { label: 'Excel', re: /\bexcel\b/i },
  { label: 'Tableau', re: /\btableau\b/i },
  { label: 'Power BI', re: /\bpower\s*bi\b/i },
  { label: 'Marketing', re: /\bmarketing\b/i },
  { label: 'SEO', re: /\bseo\b/i },
  { label: 'Financial Modeling', re: /\bfinancial\s+model/i },
];

const TITLE_ALIAS_MAP: Record<string, string[]> = {
  designer: ['designer', 'product designer', 'ux designer', 'ui designer', 'graphic designer', 'visual designer', 'creative designer', 'apparel designer', 'fashion designer'],
  engineer: ['engineer', 'software engineer', 'developer', 'frontend engineer', 'backend engineer', 'full stack engineer'],
  analyst: ['analyst', 'data analyst', 'business analyst', 'research analyst'],
  marketer: ['marketing specialist', 'growth marketer', 'digital marketer', 'brand marketer'],
  recruiter: ['recruiter', 'talent acquisition specialist'],
};

const FUNCTION_HINTS: Array<{ label: string; re: RegExp }> = [
  { label: 'Design', re: /\bdesign|prototype|wireframe|mockup\b/i },
  { label: 'Engineering', re: /\bbuild|develop|implement|architecture|code\b/i },
  { label: 'Research', re: /\bresearch|analy(s|z)e|insight|interview\b/i },
  { label: 'Marketing', re: /\bcampaign|brand|marketing|growth|seo\b/i },
  { label: 'Operations', re: /\boperations|process|workflow|coordination\b/i },
  { label: 'Sales', re: /\bsales|pipeline|lead generation|account executive\b/i },
];

function inferLocationType(text: string, workMode?: string | null): ProcessedJobContent['locationType'] {
  const wm = String(workMode || '').toUpperCase();
  if (wm === 'REMOTE') return 'remote';
  if (wm === 'HYBRID') return 'hybrid';
  if (wm === 'IN_PERSON' || wm === 'ONSITE') return 'onsite';

  const t = normalizeWhitespaceLower(text);
  if (/\bremote\b/.test(t)) return 'remote';
  if (/\bhybrid\b/.test(t)) return 'hybrid';
  if (/\bonsite\b|\bon-site\b|\bin person\b/.test(t)) return 'onsite';
  return 'unknown';
}

function inferSeniority(title: string, description: string): string | null {
  const t = `${title} ${description}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return 'intern';
  if (/\b(entry|junior|associate)\b/.test(t)) return 'entry';
  if (/\b(mid|intermediate)\b/.test(t)) return 'mid';
  if (/\b(senior|sr\.?|lead)\b/.test(t)) return 'senior';
  if (/\b(principal|staff|director|vp|head of)\b/.test(t)) return 'leadership';
  return null;
}

function parseRequirementBullets(description: string): { must: string[]; nice: string[]; minimumQualifications: string[] } {
  const lines = description
    .split(/\n|\r/)
    .map((l) => stripPunctuationEdges(l).trim())
    .filter(Boolean)
    .slice(0, 140);
  const must: string[] = [];
  const nice: string[] = [];
  const minimumQualifications: string[] = [];
  for (const raw of lines) {
    const line = normalizeWhitespaceLower(raw);
    if (line.length < 8) continue;
    if (/\b(required|must have|must|minimum|need to|need|requirements)\b/.test(line)) {
      must.push(raw);
      if (/\b(years?|degree|bachelor|master|gpa|experience)\b/.test(line)) {
        minimumQualifications.push(raw);
      }
      continue;
    }
    if (/\b(preferred|nice to have|plus|bonus|ideal)\b/.test(line)) {
      nice.push(raw);
      continue;
    }
  }
  return {
    must: must.slice(0, 12),
    nice: nice.slice(0, 12),
    minimumQualifications: minimumQualifications.slice(0, 10),
  };
}

function normalizeIndustryList(industry: string | null | undefined, text: string): string[] {
  const out: string[] = [];
  const primary = cleanSkillPhrase(String(industry || ''));
  if (primary) out.push(primary);
  const t = normalizeWhitespaceLower(text);
  const hints = ['technology', 'finance', 'healthcare', 'education', 'retail', 'marketing', 'real estate', 'legal', 'manufacturing'];
  for (const h of hints) {
    if (t.includes(h)) out.push(h);
  }
  return dedupeSkillList(out).slice(0, 6);
}

function extractSkillPhrases(text: string, tags: string[]): { required: string[]; preferred: string[]; keywords: string[] } {
  const blob = normalizeWhitespaceLower(`${text} ${tags.join(' ')}`);
  const required: string[] = [];
  for (const { label, re } of SKILL_PATTERNS) {
    if (re.test(blob)) required.push(label);
  }
  const tagSkills = dedupeSkillList(tags.map((t) => cleanSkillPhrase(t) || '').filter(Boolean));
  const requiredDeduped = dedupeSkillList([...required, ...tagSkills]).slice(0, 24);
  const preferred = dedupeSkillList(tagSkills.filter((t) => !requiredDeduped.some((r) => normalizeWhitespaceLower(r) === normalizeWhitespaceLower(t)))).slice(0, 16);

  const keywords = normalizeKeywordList(
    [
      ...tags.flatMap((t) => normalizeWhitespaceLower(t).split(/\s+/)),
      ...normalizeWhitespaceLower(text).split(/\s+/),
    ],
    30
  );

  return { required: requiredDeduped, preferred, keywords };
}

function inferJobFunctions(text: string): string[] {
  const out: string[] = [];
  for (const h of FUNCTION_HINTS) {
    if (h.re.test(text)) out.push(h.label);
  }
  return dedupeSkillList(out).slice(0, 8);
}

function inferRoleAliases(normalizedTitle: string): string[] {
  const t = normalizeWhitespaceLower(normalizedTitle);
  const aliases = new Set<string>(expandTitleMatchSignals(normalizedTitle));
  for (const [k, vals] of Object.entries(TITLE_ALIAS_MAP)) {
    if (t.includes(k) || vals.some((v) => t.includes(v))) {
      vals.forEach((v) => aliases.add(v));
    }
  }
  return dedupeSkillList([...aliases]).slice(0, 16);
}

function extractMinGpa(description: string, fallback: string | null | undefined): string | null {
  const fromInput = String(fallback || '').trim();
  if (fromInput) return fromInput.replace(/\+/g, '');
  const m = description.match(/\b(?:min(?:imum)?\s+gpa|gpa)\s*[:>=]?\s*(\d(?:\.\d{1,2})?)/i);
  return m?.[1] || null;
}

function filterNoisySkillPhrases(items: string[], max: number): string[] {
  return dedupeSkillList(items.map(String))
    .filter((s) => {
      const k = normalizeWhitespaceLower(s);
      if (k.length < 4) return false;
      if (isGenericAnchorToken(k)) return false;
      return true;
    })
    .slice(0, max);
}

function heuristicAnchorSkills(
  canonicalRole: string,
  requiredTools: string[],
  domainKeywords: string[],
  requiredSkills: string[]
): string[] {
  const cfg = SPECIALIZED_ROLE_CONFIG[canonicalRole];
  const fromCfg = cfg?.strongSignals || [];
  return filterNoisySkillPhrases(
    [...fromCfg, ...requiredTools, ...domainKeywords, ...requiredSkills.slice(0, 8)],
    22
  );
}

function mergeParsedAnchors(parsedAnchors: unknown, heuristicAnchors: string[]): string[] {
  const raw = Array.isArray(parsedAnchors) ? filterNoisySkillPhrases(parsedAnchors as string[], 24) : [];
  if (raw.length >= 2) {
    return dedupeSkillList([...raw, ...heuristicAnchors]).slice(0, 24);
  }
  return dedupeSkillList([...heuristicAnchors, ...raw]).slice(0, 24);
}

function sanitizeParsedShape(
  parsed: OpenAiParsedJobShape,
  fallback: ProcessedJobContent,
  jobDescription: string
): ProcessedJobContent {
  const titleOnlyFallback = `${parsed.normalizedTitle || ''} ${fallback.normalizedTitle || ''}`.trim();
  let roleResolved = resolveCanonicalRoleKey(
    parsed.canonicalRole || parsed.normalizedTitle || fallback.normalizedTitle,
    titleOnlyFallback
  );
  if (roleResolved.canonicalRole === 'generalist') {
    const descSlice = String(jobDescription || '').slice(0, 12000);
    const richFallback = `${titleOnlyFallback} ${descSlice}`.trim();
    const fromRichText = resolveCanonicalRoleKey('', richFallback);
    if (fromRichText.canonicalRole !== 'generalist') {
      roleResolved = fromRichText;
    }
  }
  const preferParsedOrFallback = (arr: unknown, fb: string[], max: number): string[] => {
    const parsedArr = Array.isArray(arr) ? filterNoisySkillPhrases((arr as string[]).map(String), max) : [];
    if (parsedArr.length > 0) return parsedArr.slice(0, max);
    return filterNoisySkillPhrases(fb, max);
  };
  const normalizedTitle = (parsed.normalizedTitle || fallback.normalizedTitle).trim();
  const requiredSkills = filterNoisySkillPhrases(
    Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills.map(String) : fallback.requiredSkills,
    25
  );
  const preferredSkills = filterNoisySkillPhrases(
    Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills.map(String) : fallback.preferredSkills,
    20
  );
  const kwSource = Array.isArray(parsed.keywords) ? (parsed.keywords as string[]).map(String) : fallback.keywords;
  const keywords = normalizeKeywordList(filterNoisySkillPhrases(kwSource, 40), 32);
  const mustHaves = dedupeSkillList(Array.isArray(parsed.mustHaves) ? parsed.mustHaves.map(String) : fallback.mustHaves).slice(0, 12);
  const niceToHaves = dedupeSkillList(Array.isArray(parsed.niceToHaves) ? parsed.niceToHaves.map(String) : fallback.niceToHaves).slice(0, 12);
  const jobFunctions = dedupeSkillList(Array.isArray(parsed.jobFunctions) ? parsed.jobFunctions.map(String) : fallback.jobFunctions).slice(0, 10);
  const requiredMajors = dedupeSkillList(Array.isArray(parsed.requiredMajors) ? parsed.requiredMajors.map(String) : fallback.requiredMajors).slice(0, 10);
  const preferredMajors = dedupeSkillList(Array.isArray(parsed.preferredMajors) ? parsed.preferredMajors.map(String) : fallback.preferredMajors).slice(0, 10);
  const industries = dedupeSkillList(Array.isArray(parsed.industries) ? parsed.industries.map(String) : fallback.industries).slice(0, 8);
  const minimumQualifications = dedupeSkillList(
    Array.isArray(parsed.minimumQualifications) ? parsed.minimumQualifications.map(String) : fallback.minimumQualifications
  ).slice(0, 10);
  const roleAliases = dedupeSkillList(Array.isArray(parsed.roleAliases) ? parsed.roleAliases.map(String) : fallback.roleAliases).slice(0, 18);

  const locationType = parsed.locationType || fallback.locationType;
  const minGpa = String(parsed.minGpa ?? fallback.minGpa ?? '').replace(/\+/g, '').trim() || null;

  const hb = preferParsedOrFallback(parsed.hardRequirements, fallback.hardRequirements, 16);
  const tools = preferParsedOrFallback(parsed.requiredTools, fallback.requiredTools, 12);
  const dk = preferParsedOrFallback(parsed.domainKeywords, fallback.domainKeywords, 16);
  const anchorSkills = mergeParsedAnchors(
    parsed.anchorSkills,
    heuristicAnchorSkills(roleResolved.canonicalRole, tools, dk, requiredSkills.length ? requiredSkills : fallback.requiredSkills)
  );

  return {
    normalizedTitle,
    canonicalRole: roleResolved.canonicalRole,
    roleFamily: roleResolved.roleFamily,
    roleSpecialization: roleResolved.roleSpecialization,
    hardRequirements: hb,
    softRequirements: preferParsedOrFallback(parsed.softRequirements, fallback.softRequirements, 16),
    requiredTools: tools,
    domainKeywords: dk,
    experienceRequirements: preferParsedOrFallback(
      parsed.experienceRequirements,
      fallback.experienceRequirements,
      12
    ),
    educationRequirements: preferParsedOrFallback(
      parsed.educationRequirements,
      fallback.educationRequirements,
      12
    ),
    seniorityLevel: parsed.seniorityLevel ?? fallback.seniorityLevel,
    requiredSkills: requiredSkills.length ? requiredSkills : fallback.requiredSkills,
    preferredSkills,
    keywords: keywords.length ? keywords : fallback.keywords,
    mustHaves,
    niceToHaves,
    jobFunctions,
    functionalArea: parsed.functionalArea?.trim() || fallback.functionalArea,
    industries,
    experienceLevel: parsed.experienceLevel?.trim() || fallback.experienceLevel,
    requiredMajors,
    preferredMajors,
    sponsorshipAccepted:
      typeof parsed.sponsorshipAccepted === 'boolean'
        ? parsed.sponsorshipAccepted
        : fallback.sponsorshipAccepted,
    relocationAccepted:
      typeof parsed.relocationAccepted === 'boolean'
        ? parsed.relocationAccepted
        : fallback.relocationAccepted,
    locationType,
    minimumQualifications,
    roleAliases,
    aiSummary: parsed.aiSummary?.trim() || fallback.aiSummary,
    minGpa,
    anchorSkills,
    source: 'openai',
  };
}

export function heuristicParseJob(input: ParseInput): ProcessedJobContent {
  const mergedLocation = [input.location, input.locationCity, input.locationState].filter(Boolean).join(' ');
  const merged = `${input.title}\n${input.description}\n${input.tags.join(', ')}\n${mergedLocation}\n${input.jobType || ''}\n${input.industry || ''}`;
  const seniority = inferSeniority(input.title, input.description);
  const locationType = inferLocationType(`${merged} ${input.location || ''}`, input.jobType);
  const skillData = extractSkillPhrases(`${input.title}\n${input.description}`, input.tags);
  const requiredMajors = dedupeSkillList((input.requiredMajors || []).map(String)).slice(0, 10);
  const preferredMajors = dedupeSkillList((input.preferredMajors || []).map(String)).slice(0, 10);
  const requiredSkillsStructured = dedupeSkillList((input.requiredSkillsStructured || []).map(String)).slice(0, 24);
  const preferredSkillsStructured = dedupeSkillList((input.preferredSkillsStructured || []).map(String)).slice(0, 16);
  const req = parseRequirementBullets(input.description);
  const normalizedTitle = stripPunctuationEdges(input.title).trim();
  const roleAliases = inferRoleAliases(normalizedTitle);
  const industries = normalizeIndustryList(input.industry, merged);
  const jobFunctions = inferJobFunctions(merged);
  const minGpa = extractMinGpa(input.description, input.minGpa);
  const roleClass = classifyRole(`${input.title}\n${input.description}`);
  const reqBlocks = parseJobRequirements(
    input.title,
    input.description,
    dedupeSkillList([...requiredSkillsStructured, ...skillData.required]).slice(0, 24),
    dedupeSkillList([...preferredSkillsStructured, ...skillData.preferred]).slice(0, 16),
    req.minimumQualifications
  );
  const specialized = SPECIALIZED_ROLE_CONFIG[roleClass.canonicalRole];
  const enrichedDomainKeywords = specialized
    ? dedupeSkillList([...reqBlocks.domainKeywords, ...specialized.strongSignals]).slice(0, 18)
    : reqBlocks.domainKeywords;
  const reqSkillList = dedupeSkillList([...requiredSkillsStructured, ...skillData.required]).slice(0, 24);
  const anchorSkills = heuristicAnchorSkills(
    roleClass.canonicalRole,
    reqBlocks.requiredTools,
    enrichedDomainKeywords,
    reqSkillList
  );

  return {
    normalizedTitle,
    canonicalRole: roleClass.canonicalRole,
    roleFamily: roleClass.roleFamily,
    roleSpecialization: roleClass.roleSpecialization,
    hardRequirements: reqBlocks.hardRequirements,
    softRequirements: reqBlocks.softRequirements,
    requiredTools: reqBlocks.requiredTools,
    domainKeywords: enrichedDomainKeywords,
    experienceRequirements: reqBlocks.experienceRequirements,
    educationRequirements: reqBlocks.educationRequirements,
    seniorityLevel: seniority,
    requiredSkills: reqSkillList,
    preferredSkills: dedupeSkillList([...preferredSkillsStructured, ...skillData.preferred]).slice(0, 16),
    keywords: skillData.keywords,
    mustHaves: req.must,
    niceToHaves: req.nice,
    jobFunctions,
    functionalArea: input.functionalArea?.trim() || (jobFunctions[0] ?? null),
    industries,
    experienceLevel: input.experienceLevel?.trim() || seniority,
    requiredMajors,
    preferredMajors,
    sponsorshipAccepted:
      typeof input.sponsorshipAccepted === 'boolean' ? input.sponsorshipAccepted : null,
    relocationAccepted:
      typeof input.relocationAccepted === 'boolean' ? input.relocationAccepted : null,
    locationType,
    minimumQualifications: req.minimumQualifications,
    roleAliases,
    aiSummary: null,
    minGpa,
    anchorSkills,
    source: 'heuristic',
  };
}

/**
 * Parse a job posting into canonical normalized fields.
 * Uses OpenAI when configured; falls back to conservative heuristics.
 */
export async function parseJobPosting(input: ParseInput): Promise<ProcessedJobContent> {
  const result = await parseJobPostingDetailed(input);
  return result.processed;
}

export async function parseJobPostingDetailed(input: ParseInput): Promise<JobParseResult> {
  const fallback = heuristicParseJob(input);
  const title = String(input.title || '').slice(0, 120);
  console.info('[job-parse] OpenAI parsing started', { title });

  const prompt = `Normalize this job posting into strict JSON.
Rules:
- be conservative; do not invent requirements not present in input
- preserve role specificity (e.g. "Fashion Designer" must NOT collapse to generic "Designer")
- keep arrays sparse when uncertain
- dedupe all arrays
- no one-character tokens
- separate hard requirements (mustHaves) vs preferences (niceToHaves)
- keep skill phrases meaningful and normalized
- anchorSkills: 5–18 short domain must-have phrases for THIS role (e.g. "financial modeling", "garment construction"); omit vague tokens like "design" or "analysis" alone; leave sparse if unsure

Return keys:
normalizedTitle, canonicalRole, roleFamily, roleSpecialization,
hardRequirements, softRequirements, requiredTools, domainKeywords,
experienceRequirements, educationRequirements, seniorityLevel, requiredSkills, preferredSkills, keywords,
mustHaves, niceToHaves, jobFunctions, functionalArea, industries, experienceLevel,
requiredMajors, preferredMajors, sponsorshipAccepted, relocationAccepted, locationType,
minimumQualifications, roleAliases, aiSummary, minGpa, anchorSkills`;

  const user = `Title: ${input.title}
Description:
${input.description.slice(0, 12000)}
Tags: ${input.tags.join(', ') || 'none'}
Location: ${input.location || [input.locationCity, input.locationState].filter(Boolean).join(', ') || 'unspecified'}
Job Type: ${input.jobType || 'unspecified'}
Min GPA: ${input.minGpa || 'none'}
Industry: ${input.industry || 'unspecified'}
Experience Level: ${input.experienceLevel || 'unspecified'}
Functional Area: ${input.functionalArea || 'unspecified'}
Required Majors: ${(input.requiredMajors || []).join(', ') || 'none'}
Preferred Majors: ${(input.preferredMajors || []).join(', ') || 'none'}
Sponsorship Accepted: ${typeof input.sponsorshipAccepted === 'boolean' ? String(input.sponsorshipAccepted) : 'unspecified'}
Relocation Accepted: ${typeof input.relocationAccepted === 'boolean' ? String(input.relocationAccepted) : 'unspecified'}`;

  if (!String(process.env.OPENAI_API_KEY || '').trim()) {
    console.warn('[job-parse] OpenAI parsing failed: missing API key');
    console.info('[job-parse] fallback heuristic parser used', { title });
    return { processed: fallback, aiProcessingSource: 'heuristic' };
  }

  try {
    const { openaiJsonCompletion } = await import('@/lib/ai/openai-json');
    const ai = await openaiJsonCompletion<OpenAiParsedJobShape>(prompt, user, {
      maxTokens: 1200,
      temperature: 0.1,
    });
    if (!ai.ok) {
      console.warn('[job-parse] OpenAI parsing failed', {
        title,
        error: ai.error || 'unknown-error',
      });
      console.info('[job-parse] fallback heuristic parser used', { title });
      return { processed: fallback, aiProcessingSource: 'failed' };
    }

    try {
      const processed = sanitizeParsedShape(ai.data, fallback, input.description);
      console.info('[job-parse] OpenAI parsing succeeded', {
        title,
        normalizedTitle: processed.normalizedTitle,
      });
      return { processed, aiProcessingSource: 'openai' };
    } catch (error) {
      console.warn('[job-parse] OpenAI parsing failed: sanitize error', {
        title,
        error: error instanceof Error ? error.message : String(error),
      });
      console.info('[job-parse] fallback heuristic parser used', { title });
      return { processed: fallback, aiProcessingSource: 'failed' };
    }
  } catch (error) {
    console.warn('[job-parse] OpenAI parsing failed: runtime error', {
      title,
      error: error instanceof Error ? error.message : String(error),
    });
    console.info('[job-parse] fallback heuristic parser used', { title });
    return { processed: fallback, aiProcessingSource: 'failed' };
  }
}

/**
 * Offline guard: model `canonicalRole: generalist` must not win when title + description
 * clearly indicate a taxonomy role (e.g. Financial Analyst).
 * Run: `npx tsx scripts/validate-role-resolution.ts`
 */
export function verifyFinancialAnalystGeneralistSanitizeOverride(): boolean {
  const input: ParseInput = {
    title: 'Financial Analyst',
    description:
      'Support FP&A with financial modeling, DCF analysis, and advanced Excel. Partner with finance leadership on forecasts.',
    tags: [],
    requiredMajors: [],
    preferredMajors: [],
    requiredSkillsStructured: [],
    preferredSkillsStructured: [],
  };
  const fallback = heuristicParseJob(input);
  const parsed: OpenAiParsedJobShape = {
    canonicalRole: 'generalist',
    normalizedTitle: 'Financial Analyst',
  };
  const processed = sanitizeParsedShape(parsed, fallback, input.description);
  return processed.canonicalRole !== 'generalist';
}

