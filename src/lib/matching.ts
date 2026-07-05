/**
 * Pure matching engine. Deterministic, order-independent, normalized.
 * Ported verbatim from the web app so scores match exactly.
 *
 * Weighting: 60% skill overlap, 15% role alignment, 10% progress,
 * 10% profile completeness, 5% experience alignment.
 */

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\s_\-/]+/g, " ")
    .replace(/[^\w+#. ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSkills(skills: string[]): string[] {
  const set = new Set<string>();
  for (const s of skills ?? []) {
    const n = normalizeToken(s);
    if (n) set.add(n);
  }
  return [...set].sort();
}

const ROLE_STOPWORDS = new Set([
  "internship", "intern", "internships",
  "developer", "engineer", "engineering",
  "the", "a", "an", "and", "or", "of", "for",
  "junior", "senior", "lead", "mid",
  "i", "ii", "iii",
]);

function normalizeRole(role: string | null | undefined): Set<string> {
  if (!role) return new Set();
  const tokens = normalizeToken(role).split(" ").filter(Boolean);
  return new Set(tokens.filter((t) => !ROLE_STOPWORDS.has(t)));
}

export function calculateSkillOverlap(studentSkills: string[], requiredSkills: string[]): number {
  const required = normalizeSkills(requiredSkills);
  if (!required.length) return 0;
  const student = new Set(normalizeSkills(studentSkills));
  const matched = required.filter((s) => student.has(s)).length;
  return Math.round((matched / required.length) * 100);
}

export function calculateRoleMatch(
  studentRole: string | null | undefined,
  internshipRole: string,
): number {
  const a = normalizeRole(studentRole);
  const b = normalizeRole(internshipRole);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  const union = new Set([...a, ...b]).size;
  const jaccard = union ? shared / union : 0;
  const aSubset = [...a].every((t) => b.has(t));
  const bSubset = [...b].every((t) => a.has(t));
  if (aSubset || bSubset) return Math.max(80, Math.round(jaccard * 100));
  return Math.round(jaccard * 100);
}

export interface MatchInput {
  studentSkills: string[];
  studentRole?: string | null;
  studentProgress?: number;
  studentCompleteness?: number;
  studentExperienceYears?: number;
  requiredExperienceYears?: number;
  requiredSkills: string[];
  internshipRole: string;
}

export function calculateMatchScore(input: MatchInput): number {
  const nSkills = normalizeSkills(input.studentSkills);
  const nRequired = normalizeSkills(input.requiredSkills);
  const skill = calculateSkillOverlap(nSkills, nRequired);
  const role = calculateRoleMatch(input.studentRole, input.internshipRole);
  const progress = Math.min(100, Math.max(0, input.studentProgress ?? 0));

  const skillsBreadth = Math.min(100, nSkills.length * 12);
  const roleKnown = input.studentRole ? 100 : 0;
  const completeness = Math.round(
    input.studentCompleteness ?? skillsBreadth * 0.5 + progress * 0.3 + roleKnown * 0.2,
  );

  let experience = 50;
  if (input.studentExperienceYears != null && input.requiredExperienceYears != null) {
    const gap = Math.abs(input.studentExperienceYears - input.requiredExperienceYears);
    experience = Math.max(0, Math.round(100 - gap * 20));
  }

  const final = Math.round(
    skill * 0.6 + role * 0.15 + progress * 0.1 + completeness * 0.1 + experience * 0.05,
  );
  return Math.min(100, Math.max(0, final));
}

export function matchTier(score: number): { label: string; key: "excellent" | "strong" | "decent" | "low" } {
  if (score >= 80) return { label: "Excellent match", key: "excellent" };
  if (score >= 60) return { label: "Strong match", key: "strong" };
  if (score >= 40) return { label: "Decent match", key: "decent" };
  return { label: "Low match", key: "low" };
}
