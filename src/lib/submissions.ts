/**
 * Submit + score a challenge (platform or internship). Client-side port of the
 * web server function: deep GitHub static analysis (25%) blended with an AI
 * recruiter review (75%, Groq -> Gemini -> Lovable failover).
 */
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import { evaluateGithubRepo, type GithubEvalReport } from "@/lib/github";

export interface AiEvaluation {
  overallScore: number;
  categoryScores: {
    functionality: number;
    codeQuality: number;
    architecture: number;
    challengeRelevance: number;
    authenticity: number;
    documentation: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recruiterSummary: string;
  redFlags: string[];
}

const DEFAULT_AI: AiEvaluation = {
  overallScore: 0,
  categoryScores: { functionality: 0, codeQuality: 0, architecture: 0, challengeRelevance: 0, authenticity: 0, documentation: 0 },
  strengths: [], weaknesses: [], suggestions: [], redFlags: [],
  recruiterSummary: "",
};

export interface PersistedReport {
  ok: boolean;
  isPublic: boolean;
  hasReadme: boolean;
  readmeQuality: number;
  completionPercentage: number;
  filesFound: string[];
  filesMissing: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
  framework: GithubEvalReport["framework"];
  structure: GithubEvalReport["structure"];
  commits: GithubEvalReport["commits"];
  category: string;
  ai: AiEvaluation | null;
  finalScore: number;
  passed: boolean;
  aiAvailable: boolean;
  message: string;
}

async function aiEvaluate(input: {
  category: string;
  title: string;
  description: string;
  instructions: string;
  githubUrl: string;
  report: GithubEvalReport;
}): Promise<AiEvaluation | null> {
  const groqKey = env.GROQ_API_KEY;
  const geminiKey = env.GEMINI_API_KEY;
  const lovableKey = env.LOVABLE_API_KEY;
  if (!groqKey && !geminiKey && !lovableKey) return null;

  const groqModel = env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const geminiModel = env.GEMINI_MODEL || "gemini-2.5-flash";

  const r = input.report;
  const MAX_CODE_CHARS = 28_000;
  const codeParts: string[] = [];
  let usedChars = 0;
  for (const s of r.codeSamples) {
    const block = `--- ${s.path} (${s.loc} LOC) ---\n${s.excerpt}`;
    if (usedChars + block.length > MAX_CODE_CHARS) {
      codeParts.push(`--- (${r.codeSamples.length - codeParts.length} more file(s) omitted to fit AI token limits) ---`);
      break;
    }
    codeParts.push(block);
    usedChars += block.length;
  }
  const codeBlock = codeParts.join("\n\n");

  const prompt = `You are a senior engineering recruiter and technical interviewer.
You are reviewing a candidate's GitHub submission for an internship challenge.
Score the submission as a real technical assessment, not by keyword matching.

═══════════════════════════════════════════
CHALLENGE
═══════════════════════════════════════════
Title:    ${input.title}
Category: ${input.category}
Brief:    ${input.description}

Detailed requirements (what the company actually asked for):
${input.instructions?.trim().slice(0, 4000) || "(none provided beyond the brief)"}

═══════════════════════════════════════════
REPOSITORY ANALYSIS (static, automated)
═══════════════════════════════════════════
URL:                ${input.githubUrl}
Public:             ${r.isPublic}
README:             ${r.hasReadme ? `present (quality ${r.readmeQuality}/100)` : "MISSING"}
Required files:     found=[${r.filesFound.join(", ") || "none"}] missing=[${r.filesMissing.join(", ") || "none"}]
Keywords:           found=[${r.keywordsFound.join(", ") || "none"}] missing=[${r.keywordsMissing.join(", ") || "none"}]

Detected stack:
  Language:        ${r.framework.language ?? "unknown"}
  Framework:       ${r.framework.framework ?? "unknown"}
  Package manager: ${r.framework.packageManager ?? "unknown"}
  TypeScript:      ${r.framework.hasTypeScript}
  Tests:           ${r.framework.hasTests}
  CI:              ${r.framework.hasCi}
  Linter:          ${r.framework.hasLinter}
  Docker:          ${r.framework.hasDocker}

Project structure:
  Total files:       ${r.structure.totalFileCount}
  Source files:      ${r.structure.sourceFileCount}
  Top-level folders: ${r.structure.topLevelFolders.join(", ") || "(none)"}
  Has src/app/lib:   ${r.structure.hasSrcFolder}
  Has components:    ${r.structure.hasComponentsFolder}
  Has tests folder:  ${r.structure.hasTestsFolder}
  Separation score:  ${r.structure.separationOfConcerns}/100

Commit history (authenticity signals):
  Total commits:     ${r.commits.totalCommits} (analyzed ${r.commits.commitsAnalyzed})
  Unique authors:    ${r.commits.uniqueAuthors}
  Active over:       ${r.commits.daysActive} day(s)
  First commit:      ${r.commits.firstCommit ?? "n/a"}
  Last commit:       ${r.commits.lastCommit ?? "n/a"}
  Single-dump?       ${r.commits.isSingleDump}

═══════════════════════════════════════════
REPRESENTATIVE CODE SAMPLES
═══════════════════════════════════════════
${codeBlock || "(no source files could be sampled)"}

═══════════════════════════════════════════
README EXCERPT
═══════════════════════════════════════════
${(r.readmeText || "(no README)").slice(0, 2500)}

═══════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════
Evaluate as a real technical interviewer. Be strict but fair.

Rules:
- A repo with the right keywords but no real implementation is a LOW score.
- A repo whose code is unrelated to the challenge brief is a LOW score on
  challengeRelevance regardless of code quality.
- A single-dump commit history with no progressive development is a LOW
  authenticity score and must appear in redFlags.
- Reward actual implementation logic that maps directly to the challenge brief.

Return ONLY a JSON object with this exact shape (no prose, no markdown fences):
{
  "overallScore": number,
  "categoryScores": {
    "functionality": number,
    "codeQuality": number,
    "architecture": number,
    "challengeRelevance": number,
    "authenticity": number,
    "documentation": number
  },
  "strengths": [string],
  "weaknesses": [string],
  "suggestions": [string],
  "redFlags": [string],
  "recruiterSummary": string
}`;

  const systemPrompt =
    "You are a strict senior engineering interviewer. Reply with valid JSON only — no prose, no code fences.";

  async function openAiChat(url: string, key: string, model: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content;
  }

  try {
    let content: string | undefined;

    if (groqKey) {
      content = await openAiChat("https://api.groq.com/openai/v1/chat/completions", groqKey, groqModel);
    }

    if (!content && geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
              maxOutputTokens: 4096,
            },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    }

    if (!content && lovableKey) {
      content = await openAiChat("https://ai.gateway.lovable.dev/v1/chat/completions", lovableKey, "google/gemini-2.5-flash");
    }

    if (!content) return null;
    const parsed = JSON.parse(content) as AiEvaluation;
    return {
      ...DEFAULT_AI,
      ...parsed,
      categoryScores: { ...DEFAULT_AI.categoryScores, ...parsed.categoryScores },
    };
  } catch {
    return null;
  }
}

export interface SubmitArgs {
  githubUrl: string;
  platformChallengeId?: string;
  internshipChallengeId?: string;
}

export async function submitChallenge(args: SubmitArgs) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  let requiredFiles: string[] = [];
  let requiredKeywords: string[] = [];
  let points = 10;
  let title = "Challenge";
  let description = "";
  let category = "general";
  let instructions = "";

  if (args.platformChallengeId) {
    const { data: c, error } = await supabase
      .from("platform_challenges")
      .select("required_files, skill, points, title, description, category, instructions")
      .eq("id", args.platformChallengeId)
      .single();
    if (error || !c) throw new Error("Platform challenge not found");
    requiredFiles = c.required_files ?? [];
    requiredKeywords = [c.skill];
    points = c.points;
    title = c.title;
    description = c.description;
    category = c.category ?? "general";
    instructions = c.instructions ?? "";
  } else if (args.internshipChallengeId) {
    const { data: c, error } = await supabase
      .from("internship_challenges")
      .select("required_files, required_keywords, title, description, category, instructions")
      .eq("id", args.internshipChallengeId)
      .single();
    if (error || !c) throw new Error("Internship challenge not found");
    requiredFiles = c.required_files ?? [];
    requiredKeywords = c.required_keywords ?? [];
    title = c.title;
    description = c.description;
    category = c.category ?? "general";
    instructions = c.instructions ?? "";
  } else {
    throw new Error("Provide exactly one challenge id");
  }

  const report = await evaluateGithubRepo({ url: args.githubUrl, requiredFiles, requiredKeywords });
  const ai = await aiEvaluate({ category, title, description, instructions, githubUrl: args.githubUrl, report });

  const aiAvailable = ai !== null;
  const finalScore = aiAvailable ? Math.round(report.score * 0.25 + ai!.overallScore * 0.75) : 0;
  const passed = aiAvailable
    ? report.ok && report.isPublic && finalScore >= 50 && ai!.categoryScores.challengeRelevance >= 40
    : false;
  const status: "validated" | "failed" | "pending" = !aiAvailable ? "pending" : passed ? "validated" : "failed";

  const persistedReport: PersistedReport = {
    ok: report.ok, isPublic: report.isPublic, hasReadme: report.hasReadme,
    readmeQuality: report.readmeQuality, completionPercentage: report.completionPercentage,
    filesFound: report.filesFound, filesMissing: report.filesMissing,
    keywordsFound: report.keywordsFound, keywordsMissing: report.keywordsMissing,
    framework: report.framework, structure: report.structure, commits: report.commits,
    category, ai, finalScore, passed, aiAvailable,
    message: aiAvailable
      ? report.message
      : "AI evaluation couldn't run (rate-limited or unavailable). Your repo was analyzed — please resubmit in a moment to get the full score.",
  };

  const { data: submission, error: subErr } = await supabase
    .from("challenge_submissions")
    .insert({
      student_id: userId,
      platform_challenge_id: args.platformChallengeId ?? null,
      internship_challenge_id: args.internshipChallengeId ?? null,
      github_url: args.githubUrl,
      score: finalScore,
      status,
      report: JSON.parse(JSON.stringify(persistedReport)),
    })
    .select()
    .single();
  if (subErr) throw new Error(subErr.message);

  if (args.platformChallengeId && passed) {
    const { data: student } = await supabase.from("students").select("skills").eq("id", userId).single();
    if (student) {
      const { data: c } = await supabase
        .from("platform_challenges")
        .select("skill")
        .eq("id", args.platformChallengeId)
        .single();
      const skills = new Set(student.skills ?? []);
      if (c?.skill) skills.add(c.skill);

      const { data: validated } = await supabase
        .from("challenge_submissions")
        .select("platform_challenge_id")
        .eq("student_id", userId)
        .eq("status", "validated")
        .not("platform_challenge_id", "is", null);
      const completed = new Set((validated ?? []).map((r) => r.platform_challenge_id)).size;

      await supabase
        .from("students")
        .update({
          skills: [...skills],
          challenges_completed: completed,
          progress_percentage: Math.min(100, completed * 10 + points),
        })
        .eq("id", userId);
    }
  }

  return { submission, report: persistedReport, passed };
}
