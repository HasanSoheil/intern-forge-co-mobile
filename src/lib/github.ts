/**
 * GitHub repository evaluator — deep static analysis (pure REST reads).
 * Ported from the web app. Runs on-device; uses GITHUB_TOKEN from env to raise
 * the rate limit (60 -> 5000/hr). base-64 used in place of browser atob.
 */
import { decode as atobDecode } from "base-64";
import { env } from "@/lib/env";

export interface GithubEvalInput {
  url: string;
  requiredFiles?: string[];
  requiredKeywords?: string[];
}

export interface CommitSignals {
  totalCommits: number;
  uniqueAuthors: number;
  firstCommit: string | null;
  lastCommit: string | null;
  daysActive: number;
  isSingleDump: boolean;
  commitsAnalyzed: number;
}

export interface FrameworkSignals {
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  hasTests: boolean;
  hasCi: boolean;
  hasLinter: boolean;
  hasTypeScript: boolean;
  hasDocker: boolean;
}

export interface StructureSignals {
  topLevelFolders: string[];
  sourceFileCount: number;
  totalFileCount: number;
  hasSrcFolder: boolean;
  hasComponentsFolder: boolean;
  hasTestsFolder: boolean;
  hasDocsFolder: boolean;
  separationOfConcerns: number;
}

export interface CodeSample {
  path: string;
  excerpt: string;
  loc: number;
}

export interface GithubEvalReport {
  ok: boolean;
  score: number;
  repoExists: boolean;
  isPublic: boolean;
  hasReadme: boolean;
  readmeQuality: number;
  readmeText: string;
  filesFound: string[];
  filesMissing: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
  completionPercentage: number;
  message: string;
  framework: FrameworkSignals;
  structure: StructureSignals;
  commits: CommitSignals;
  codeSamples: CodeSample[];
}

const GH_RE = /github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git|\/|$)/i;

export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(GH_RE);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "crewlink-evaluator",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return headers;
}

async function ghFetch(path: string) {
  return fetch(`https://api.github.com${path}`, { headers: ghHeaders() });
}

async function ghReadText(owner: string, repo: string, path: string): Promise<string | null> {
  const r = await ghFetch(`/repos/${owner}/${repo}/contents/${path}`);
  if (!r.ok) return null;
  const d = (await r.json()) as { content?: string; encoding?: string };
  if (!d.content || d.encoding !== "base64") return null;
  try {
    return atobDecode(d.content.replace(/\n/g, ""));
  } catch {
    return null;
  }
}

function detectFramework(opts: {
  allPaths: string[];
  packageJson: Record<string, unknown> | null;
}): FrameworkSignals {
  const { allPaths, packageJson } = opts;
  const has = (re: RegExp) => allPaths.some((p) => re.test(p));
  const deps: Record<string, string> = {
    ...((packageJson?.dependencies as Record<string, string>) ?? {}),
    ...((packageJson?.devDependencies as Record<string, string>) ?? {}),
  };
  const dep = (k: string) => Object.prototype.hasOwnProperty.call(deps, k);

  let language: string | null = null;
  if (has(/\.(ts|tsx)$/)) language = "TypeScript";
  else if (has(/\.(js|jsx)$/)) language = "JavaScript";
  else if (has(/\.py$/)) language = "Python";
  else if (has(/\.go$/)) language = "Go";
  else if (has(/\.(java|kt)$/)) language = "Java/Kotlin";
  else if (has(/\.rb$/)) language = "Ruby";
  else if (has(/\.rs$/)) language = "Rust";

  let framework: string | null = null;
  if (dep("next")) framework = "Next.js";
  else if (dep("@remix-run/react")) framework = "Remix";
  else if (dep("react") && dep("vite")) framework = "React (Vite)";
  else if (dep("react")) framework = "React";
  else if (dep("vue")) framework = "Vue";
  else if (dep("svelte")) framework = "Svelte";
  else if (dep("@angular/core")) framework = "Angular";
  else if (dep("express")) framework = "Express";
  else if (dep("fastify")) framework = "Fastify";
  else if (dep("@nestjs/core")) framework = "NestJS";
  else if (has(/manage\.py$/) || has(/django/i)) framework = "Django";
  else if (has(/flask/i)) framework = "Flask";

  const packageManager = has(/^bun\.lock$|^bun\.lockb$/)
    ? "bun"
    : has(/^pnpm-lock\.yaml$/)
      ? "pnpm"
      : has(/^yarn\.lock$/)
        ? "yarn"
        : has(/^package-lock\.json$/)
          ? "npm"
          : has(/^poetry\.lock$/)
            ? "poetry"
            : has(/^Pipfile\.lock$/)
              ? "pipenv"
              : has(/^go\.sum$/)
                ? "go modules"
                : has(/^Cargo\.lock$/)
                  ? "cargo"
                  : null;

  return {
    language,
    framework,
    packageManager,
    hasTests:
      has(/(\.test\.|\.spec\.|^tests?\/|^__tests__\/)/i) ||
      dep("vitest") || dep("jest") || dep("mocha") || dep("@playwright/test") || dep("cypress"),
    hasCi: has(/^\.github\/workflows\//) || has(/^\.gitlab-ci\.yml$/) || has(/^\.circleci\//),
    hasLinter: dep("eslint") || dep("prettier") || dep("biome") || has(/^\.eslintrc/) || has(/^\.prettierrc/),
    hasTypeScript: dep("typescript") || has(/tsconfig\.json$/) || has(/\.tsx?$/),
    hasDocker: has(/^Dockerfile$|^docker-compose\.ya?ml$/i),
  };
}

function detectStructure(allPaths: string[]): StructureSignals {
  const topLevel = new Set<string>();
  for (const p of allPaths) {
    const seg = p.split("/")[0];
    if (seg) topLevel.add(seg);
  }
  const topLevelFolders = [...topLevel].filter((s) => !s.includes("."));
  const sourceFileCount = allPaths.filter((p) =>
    /\.(js|jsx|ts|tsx|py|go|rb|java|kt|rs|vue|svelte|swift)$/i.test(p),
  ).length;

  const hasSrcFolder = topLevel.has("src") || topLevel.has("app") || topLevel.has("lib");
  const hasComponentsFolder = allPaths.some((p) => /(^|\/)components\//i.test(p));
  const hasTestsFolder = allPaths.some((p) => /(^|\/)(tests?|__tests__)\//i.test(p));
  const hasDocsFolder = topLevel.has("docs") || topLevel.has("doc");

  const concerns = [
    /\/components?\//i, /\/pages?\//i, /\/routes?\//i, /\/services?\//i,
    /\/hooks?\//i, /\/utils?\//i, /\/lib\//i, /\/models?\//i, /\/controllers?\//i,
    /\/api\//i, /\/store\//i, /\/styles?\//i, /\/types?\//i,
  ];
  const matched = concerns.filter((re) => allPaths.some((p) => re.test(p))).length;
  const separationOfConcerns = Math.min(100, Math.round((matched / concerns.length) * 100));

  return {
    topLevelFolders: topLevelFolders.slice(0, 20),
    sourceFileCount,
    totalFileCount: allPaths.length,
    hasSrcFolder,
    hasComponentsFolder,
    hasTestsFolder,
    hasDocsFolder,
    separationOfConcerns,
  };
}

async function fetchCommits(owner: string, repo: string): Promise<CommitSignals> {
  const empty: CommitSignals = {
    totalCommits: 0, uniqueAuthors: 0, firstCommit: null, lastCommit: null,
    daysActive: 0, isSingleDump: false, commitsAnalyzed: 0,
  };
  const r = await ghFetch(`/repos/${owner}/${repo}/commits?per_page=100`);
  if (!r.ok) return empty;
  const commits = (await r.json()) as Array<{
    commit: { author: { name?: string; email?: string; date?: string } };
  }>;
  if (!Array.isArray(commits) || !commits.length) return empty;
  const authors = new Set<string>();
  const dates: number[] = [];
  for (const c of commits) {
    const a = c.commit?.author;
    if (a?.email) authors.add(a.email.toLowerCase());
    else if (a?.name) authors.add(a.name.toLowerCase());
    if (a?.date) dates.push(new Date(a.date).getTime());
  }
  dates.sort((a, b) => a - b);
  const first = dates[0] ?? null;
  const last = dates[dates.length - 1] ?? null;
  const daysActive = first && last ? Math.max(0, Math.round((last - first) / 86400000)) : 0;
  const spreadMs = first && last ? last - first : 0;
  const isSingleDump = commits.length === 1 || (commits.length >= 5 && spreadMs < 10 * 60 * 1000);
  return {
    totalCommits: commits.length,
    uniqueAuthors: authors.size,
    firstCommit: first ? new Date(first).toISOString() : null,
    lastCommit: last ? new Date(last).toISOString() : null,
    daysActive,
    isSingleDump,
    commitsAnalyzed: commits.length,
  };
}

function pickRepresentativeFiles(allPaths: string[], max = 12): string[] {
  const sourceExts = /\.(js|jsx|ts|tsx|py|go|rb|java|kt|rs|vue|svelte)$/i;
  const candidates = allPaths.filter(
    (p) => sourceExts.test(p) && !/node_modules|dist|build|\.min\./i.test(p),
  );
  const byFolder = new Map<string, string[]>();
  for (const p of candidates) {
    const folder = p.split("/").slice(0, -1).join("/") || ".";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(p);
  }
  const picked: string[] = [];
  const folders = [...byFolder.keys()];
  let i = 0;
  while (picked.length < max && folders.length) {
    const f = folders[i % folders.length];
    const list = byFolder.get(f)!;
    if (list.length) picked.push(list.shift()!);
    else folders.splice(i % folders.length, 1);
    i++;
    if (i > 1000) break;
  }
  return picked;
}

export async function evaluateGithubRepo(input: GithubEvalInput): Promise<GithubEvalReport> {
  const empty: GithubEvalReport = {
    ok: false, score: 0, repoExists: false, isPublic: false,
    hasReadme: false, readmeQuality: 0, readmeText: "",
    filesFound: [], filesMissing: input.requiredFiles ?? [],
    keywordsFound: [], keywordsMissing: input.requiredKeywords ?? [],
    completionPercentage: 0,
    message: "Invalid GitHub URL.",
    framework: { language: null, framework: null, packageManager: null, hasTests: false, hasCi: false, hasLinter: false, hasTypeScript: false, hasDocker: false },
    structure: { topLevelFolders: [], sourceFileCount: 0, totalFileCount: 0, hasSrcFolder: false, hasComponentsFolder: false, hasTestsFolder: false, hasDocsFolder: false, separationOfConcerns: 0 },
    commits: { totalCommits: 0, uniqueAuthors: 0, firstCommit: null, lastCommit: null, daysActive: 0, isSingleDump: false, commitsAnalyzed: 0 },
    codeSamples: [],
  };

  const parsed = parseGithubUrl(input.url);
  if (!parsed) return empty;
  const { owner, repo } = parsed;

  const repoRes = await ghFetch(`/repos/${owner}/${repo}`);
  if (repoRes.status === 404) return { ...empty, message: "Repository not found or private." };
  if (repoRes.status === 403 || repoRes.status === 429) {
    const remaining = repoRes.headers.get("x-ratelimit-remaining");
    const msg = remaining === "0"
      ? "GitHub API rate limit exceeded."
      : "GitHub API access forbidden (403).";
    return { ...empty, message: msg };
  }
  if (!repoRes.ok) return { ...empty, message: `GitHub API error (${repoRes.status}).` };
  const repoMeta = (await repoRes.json()) as { private: boolean; default_branch: string };
  const isPublic = !repoMeta.private;

  const treeRes = await ghFetch(`/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch}?recursive=1`);
  const tree = treeRes.ok
    ? ((await treeRes.json()) as { tree: { path: string; type: string }[] })
    : { tree: [] };
  const allPaths = (tree.tree ?? []).filter((t) => t.type === "blob").map((t) => t.path);

  let packageJson: Record<string, unknown> | null = null;
  if (allPaths.includes("package.json")) {
    const pkgText = await ghReadText(owner, repo, "package.json");
    if (pkgText) {
      try {
        packageJson = JSON.parse(pkgText);
      } catch {
        /* ignore */
      }
    }
  }

  const readmePath = allPaths.find((p) => /^readme(\.md|\.txt)?$/i.test(p));
  let hasReadme = false;
  let readmeText = "";
  let readmeQuality = 0;
  if (readmePath) {
    hasReadme = true;
    readmeText = (await ghReadText(owner, repo, readmePath)) ?? "";
    const len = readmeText.length;
    const hasHeading = /^#\s/m.test(readmeText);
    const hasCode = /```/.test(readmeText);
    const hasInstall = /install|setup|getting started|usage|how to/i.test(readmeText);
    readmeQuality = Math.min(
      100,
      (len > 400 ? 40 : Math.round((len / 400) * 40)) +
        (hasHeading ? 20 : 0) + (hasCode ? 20 : 0) + (hasInstall ? 20 : 0),
    );
  }

  const required = input.requiredFiles ?? [];
  const filesFound: string[] = [];
  const filesMissing: string[] = [];
  for (const f of required) {
    const needle = f.toLowerCase();
    if (allPaths.some((p) => p.toLowerCase() === needle || p.toLowerCase().endsWith("/" + needle)))
      filesFound.push(f);
    else filesMissing.push(f);
  }

  const sampledPaths = pickRepresentativeFiles(allPaths, 12);
  const codeSamples: CodeSample[] = [];
  let haystack = readmeText.toLowerCase();
  for (const p of sampledPaths) {
    const text = await ghReadText(owner, repo, p);
    if (!text) continue;
    const excerpt = text.length > 4000 ? text.slice(0, 4000) + "\n…[truncated]" : text;
    codeSamples.push({ path: p, excerpt, loc: text.split("\n").length });
    haystack += "\n" + text.toLowerCase();
  }

  const keywords = input.requiredKeywords ?? [];
  const keywordsFound: string[] = [];
  const keywordsMissing: string[] = [];
  for (const k of keywords) {
    if (haystack.includes(k.toLowerCase())) keywordsFound.push(k);
    else keywordsMissing.push(k);
  }

  const framework = detectFramework({ allPaths, packageJson });
  const structure = detectStructure(allPaths);
  const commits = await fetchCommits(owner, repo);

  const fileScore = required.length ? (filesFound.length / required.length) * 100 : 100;
  const kwScore = keywords.length ? (keywordsFound.length / keywords.length) * 100 : 100;
  const score = Math.round(
    fileScore * 0.35 + readmeQuality * 0.2 + kwScore * 0.2 +
      structure.separationOfConcerns * 0.15 + (isPublic ? 10 : 0),
  );
  const completionPercentage = Math.round((fileScore + kwScore) / 2);

  return {
    ok: true, score, repoExists: true, isPublic,
    hasReadme, readmeQuality, readmeText,
    filesFound, filesMissing, keywordsFound, keywordsMissing, completionPercentage,
    message: isPublic ? "Submission analyzed successfully." : "Repository must be public.",
    framework, structure, commits, codeSamples,
  };
}
