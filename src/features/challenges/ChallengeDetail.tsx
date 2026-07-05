import { useEffect, useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  FileText,
  FileCode2,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
} from "lucide-react-native";
import {
  Screen,
  Header,
  Text,
  Card,
  Badge,
  Button,
  Input,
  ProgressBar,
  Loading,
  useToast,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { submitChallenge, type PersistedReport } from "@/lib/submissions";

const CATEGORY_LABEL: Record<string, string> = {
  functionality: "Functionality",
  codeQuality: "Code quality",
  architecture: "Architecture",
  challengeRelevance: "Challenge relevance",
  authenticity: "Authenticity",
  documentation: "Documentation",
};

export function ChallengeDetail({ id, type }: { id: string; type: "platform" | "internship" }) {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const { user } = useAuth();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PersistedReport | null>(null);

  const { data: challenge } = useQuery({
    queryKey: ["challenge", type, id],
    queryFn: async () => {
      if (type === "platform") {
        return (await supabase.from("platform_challenges").select("*").eq("id", id).single()).data;
      }
      return (
        await supabase
          .from("internship_challenges")
          .select("*,internships(id,title,company_id)")
          .eq("id", id)
          .single()
      ).data;
    },
  });

  const { data: existingSub } = useQuery({
    queryKey: ["my-sub", type, id, user?.id],
    queryFn: async () => {
      const col = type === "platform" ? "platform_challenge_id" : "internship_challenge_id";
      const { data } = await supabase
        .from("challenge_submissions")
        .select("id,github_url,score,status,report,submitted_at")
        .eq("student_id", user!.id)
        .eq(col, id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (existingSub?.report) setReport(existingSub.report as unknown as PersistedReport);
    if (existingSub?.github_url) setUrl(existingSub.github_url);
  }, [existingSub?.id]);

  const handleSubmit = async () => {
    if (!url.match(/github\.com\/[\w.-]+\/[\w.-]+/)) {
      toast.error("Please paste a valid GitHub repository URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await submitChallenge(
        type === "platform"
          ? { githubUrl: url, platformChallengeId: id }
          : { githubUrl: url, internshipChallengeId: id },
      );
      const rep = res.report;
      setReport(rep);
      if (rep.aiAvailable === false) {
        toast.warning("Repo analyzed, but the AI review couldn't run (rate-limited). Please resubmit in a moment.");
      } else if (rep.finalScore >= 50) {
        toast.success(`Validated! Score: ${rep.finalScore}/100`);
      } else {
        toast.error(`Submission scored ${rep.finalScore}/100. See report below.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (!challenge) {
    return (
      <Screen>
        <Header title="Challenge" back />
        <Loading />
      </Screen>
    );
  }

  const c = challenge as Record<string, unknown>;
  const done = !!existingSub && existingSub.status === "validated";
  const category = typeof c.category === "string" ? c.category : null;
  const difficulty = typeof c.difficulty === "string" ? c.difficulty : null;
  const instructions = typeof c.instructions === "string" ? c.instructions : null;
  const requiredFiles = Array.isArray(c.required_files) ? (c.required_files as string[]) : [];

  return (
    <Screen>
      <Header title="Challenge" back />

      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Badge
            label={type === "platform" ? "Platform challenge" : "Internship challenge"}
            variant={type === "platform" ? "accent" : "primary"}
          />
          {category ? <Badge label={category} variant="muted" /> : null}
          {difficulty ? <Badge label={difficulty} variant="violet" /> : null}
          {done ? (
            <Badge label="Completed" variant="success" icon={<CheckCircle2 size={12} color={colors.success} />} />
          ) : null}
        </View>

        <Text variant="title" style={{ marginTop: spacing.md }}>
          {String(c.title ?? "Challenge")}
        </Text>
        {c.description ? (
          <Text variant="muted" style={{ marginTop: 6 }}>
            {String(c.description)}
          </Text>
        ) : null}

        {instructions ? (
          <View
            style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <FileText size={13} color={colors.textMuted} />
              <Text variant="label">INSTRUCTIONS</Text>
            </View>
            <Text variant="body" style={{ lineHeight: 21 }}>
              {instructions}
            </Text>
          </View>
        ) : null}

        {requiredFiles.length > 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <FileCode2 size={13} color={colors.textMuted} />
              <Text variant="label">REQUIRED FILES</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {requiredFiles.map((f) => (
                <Badge key={f} label={f} variant="muted" />
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GitBranch size={18} color={colors.text} />
            <Text variant="h3">{done ? "Resubmit your repository" : "Submit your GitHub repository"}</Text>
          </View>
          <Text variant="muted" style={{ marginTop: 6 }}>
            Our evaluator fetches your repo, checks required files, scores README quality, and runs an AI recruiter
            review across requirements, code quality, architecture, docs, authenticity, and activity.
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <Input
              label="Repository URL"
              value={url}
              onChangeText={setUrl}
              placeholder="https://github.com/you/your-repo"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <Button
            title={loading ? "Analyzing repo + AI review…" : done ? "Resubmit & re-evaluate" : "Submit & evaluate"}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </View>

      {report ? (
        <View style={{ marginTop: spacing.lg }}>
          <ReportCard report={report} />
        </View>
      ) : null}
    </Screen>
  );
}

function ReportCard({ report }: { report: PersistedReport }) {
  const { colors, spacing, radius } = useTheme();
  const finalScore = report.finalScore;
  const passed = finalScore >= 50;
  const aiUnavailable = report.aiAvailable === false;
  const ai = report.ai;

  const filesTotal = report.filesFound.length + report.filesMissing.length;
  const keywordsTotal = report.keywordsFound.length + report.keywordsMissing.length;

  return (
    <Card>
      {aiUnavailable ? (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.warning + "66",
            backgroundColor: colors.warning + "1A",
          }}
        >
          <AlertTriangle size={22} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text variant="h3">Couldn't complete the AI review</Text>
            <Text variant="muted" style={{ marginTop: 4 }}>
              {report.message}
            </Text>
            <Text variant="caption" style={{ marginTop: 6 }}>
              Your repository was analyzed successfully (see below) — only the AI scoring step was skipped. No score has
              been recorded; please resubmit shortly.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
            {passed ? (
              <CheckCircle2 size={30} color={colors.success} />
            ) : (
              <XCircle size={30} color={colors.destructive} />
            )}
            <View style={{ flex: 1 }}>
              <Text variant="h3">{passed ? "Validated" : "Needs work"}</Text>
              <Text variant="muted" numberOfLines={3}>
                {report.message}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 40, fontWeight: "800", color: colors.primary }}>{finalScore}</Text>
            <Text variant="caption">/ 100</Text>
          </View>
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text variant="caption">Requirements completion</Text>
          <Text variant="caption">{report.completionPercentage}%</Text>
        </View>
        <ProgressBar value={report.completionPercentage} height={8} />
      </View>

      {ai ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
          {ai.recruiterSummary ? (
            <View
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.accent + "55",
                backgroundColor: colors.accent + "1A",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkles size={13} color={colors.accent} />
                <Text variant="label" color="accent">
                  RECRUITER SUMMARY
                </Text>
              </View>
              <Text variant="body" style={{ lineHeight: 21 }}>
                {ai.recruiterSummary}
              </Text>
            </View>
          ) : null}

          <View>
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              Category breakdown
            </Text>
            <View style={{ gap: spacing.sm }}>
              {(Object.keys(ai.categoryScores) as (keyof typeof ai.categoryScores)[]).map((k) => {
                const v = ai.categoryScores[k];
                return (
                  <View
                    key={k}
                    style={{
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text variant="muted">{CATEGORY_LABEL[k] ?? k}</Text>
                      <Text variant="muted" weight="800" color="text">
                        {v}/100
                      </Text>
                    </View>
                    <ProgressBar value={v} height={6} />
                  </View>
                );
              })}
            </View>
          </View>

          <FeedbackList icon={<ThumbsUp size={13} color={colors.success} />} title="Strengths" items={ai.strengths} color="success" />
          <FeedbackList icon={<AlertTriangle size={13} color={colors.warning} />} title="Weaknesses" items={ai.weaknesses} color="warning" />
          <FeedbackList icon={<Lightbulb size={13} color={colors.primary} />} title="Suggestions" items={ai.suggestions} color="primary" />
          {ai.redFlags.length > 0 ? (
            <FeedbackList
              icon={<AlertTriangle size={13} color={colors.destructive} />}
              title="Red flags"
              items={ai.redFlags}
              color="destructive"
            />
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          marginTop: spacing.lg,
          paddingTop: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: spacing.sm,
        }}
      >
        <StatRow label="Repository" value={report.isPublic ? "Public ✓" : report.ok ? "Private" : "Not found"} ok={report.isPublic} />
        <StatRow label="README" value={report.hasReadme ? `${report.readmeQuality}% quality` : "Missing"} ok={report.hasReadme} />
        <StatRow label="Files matched" value={`${report.filesFound.length}/${filesTotal}`} ok={report.filesMissing.length === 0} />
        <StatRow label="Keywords matched" value={`${report.keywordsFound.length}/${keywordsTotal}`} ok={report.keywordsMissing.length === 0} />
      </View>

      {report.filesMissing.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="caption" style={{ marginBottom: 6 }}>
            Missing files:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {report.filesMissing.map((f) => (
              <Badge key={f} label={f} variant="destructive" />
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function StatRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ width: "50%", paddingRight: spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.surface,
        }}
      >
        <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <Text variant="caption" color={ok ? "success" : "text"} weight="700">
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeedbackList({
  icon,
  title,
  items,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  color: "success" | "warning" | "primary" | "destructive";
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon}
        <Text variant="label" color={color}>
          {title.toUpperCase()}
        </Text>
      </View>
      {items.length ? (
        <View style={{ gap: 6 }}>
          {items.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <Text variant="muted">•</Text>
              <Text variant="body" style={{ flex: 1, lineHeight: 20 }}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption">No items.</Text>
      )}
    </View>
  );
}
