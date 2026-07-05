import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Clock, Building2, Trophy, GitBranch, Sparkles, CheckCircle2, Edit3, Save, Trash2,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import {
  Screen, Header, Card, Text, Button, Badge, Input, Select, MatchRing, Loading, useToast,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/matching";
import { submitChallenge } from "@/lib/submissions";
import { isDeadlinePassed } from "@/lib/utils";

interface ChallengeRow {
  id: string;
  title: string;
  instructions?: string | null;
  required_files?: string[] | null;
  required_keywords?: string[] | null;
}

interface InternshipRow {
  id: string;
  company_id: string;
  title: string;
  role: string;
  description: string;
  required_skills: string[] | null;
  location: string | null;
  remote: boolean;
  duration_months: number | null;
  stipend: number | null;
  status: string;
  application_deadline: string | null;
  companies: { company_name: string; description: string | null; logo_url: string | null; website: string | null } | null;
  internship_challenges: ChallengeRow[] | null;
}

// ISO timestamp → date string for editing (the mobile Input edits a plain string).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ChallengeForm = { title: string; instructions: string; files: string; keywords: string };

export function InternshipDetail({ id }: { id: string }) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { user, role } = useAuth();

  const [githubUrl, setGithubUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { data: internship, isLoading } = useQuery({
    queryKey: ["internship", id],
    queryFn: async () =>
      (await supabase
        .from("internships")
        .select("*,companies(company_name,description,logo_url,website),internship_challenges(id,title,instructions,required_files,required_keywords)")
        .eq("id", id)
        .single()).data as unknown as InternshipRow | null,
  });

  const { data: student } = useQuery({
    queryKey: ["me-student-min", user?.id],
    queryFn: async () =>
      (await supabase
        .from("students")
        .select("skills,desired_role,progress_percentage")
        .eq("id", user!.id)
        .maybeSingle()).data,
    enabled: !!user && role === "student",
  });

  const { data: existingApp } = useQuery({
    queryKey: ["app-check", id, user?.id],
    queryFn: async () =>
      (await supabase
        .from("applications")
        .select("id,status")
        .eq("internship_id", id)
        .eq("student_id", user!.id)
        .maybeSingle()).data,
    enabled: !!user && role === "student",
  });

  const { data: existingSub } = useQuery({
    queryKey: ["my-internship-sub", id, user?.id],
    queryFn: async () => {
      const chs = internship?.internship_challenges ?? [];
      if (!chs.length) return null;
      const { data } = await supabase
        .from("challenge_submissions")
        .select("id,github_url,score,status,submitted_at")
        .eq("student_id", user!.id)
        .in("internship_challenge_id", chs.map((c) => c.id))
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && role === "student" && !!internship,
  });

  useEffect(() => {
    if (existingSub?.github_url) setGithubUrl(existingSub.github_url);
  }, [existingSub?.github_url]);

  const apply = useMutation({
    mutationFn: async () => {
      if (!internship || !student) return;
      if (internship.status !== "open") throw new Error("This internship is closed.");
      if (isDeadlinePassed(internship.application_deadline)) {
        throw new Error("Applications for this internship have closed.");
      }
      if (!githubUrl.match(/github\.com\/[\w.-]+\/[\w.-]+/)) {
        throw new Error("Please paste a valid GitHub repository URL.");
      }
      const chs = internship.internship_challenges ?? [];
      let challengeScore = 0;

      // Challenge eval is for RANKING only — never block the application on it.
      if (chs.length) {
        setSubmitting(true);
        try {
          const result = await submitChallenge({ githubUrl, internshipChallengeId: chs[0].id });
          challengeScore = result.report?.finalScore ?? 0;
        } catch (e) {
          // Eval failure should not block applying.
          console.error("Challenge eval failed (non-blocking)", e);
        } finally {
          setSubmitting(false);
        }
      }

      if (!existingApp?.id) {
        const baseScore = calculateMatchScore({
          studentSkills: student.skills ?? [],
          studentRole: student.desired_role,
          studentProgress: student.progress_percentage ?? 0,
          requiredSkills: internship.required_skills ?? [],
          internshipRole: internship.role,
        });
        // Blend challenge score (30%) into the stored match score for ranking.
        const score = chs.length ? Math.round(baseScore * 0.7 + challengeScore * 0.3) : baseScore;
        const { error } = await supabase
          .from("applications")
          .insert({ student_id: user!.id, internship_id: id, match_score: score, status: "pending" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Application submitted!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["app-check", id] });
      qc.invalidateQueries({ queryKey: ["my-internship-sub", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // ── Owner edit state ────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", role: "", description: "", skills: "", location: "",
    remote: false, duration_months: "", stipend: "", status: "open", deadline: "",
  });
  const [challengeForms, setChallengeForms] = useState<Record<string, ChallengeForm>>({});

  const startEdit = () => {
    if (!internship) return;
    setForm({
      title: internship.title ?? "",
      role: internship.role ?? "",
      description: internship.description ?? "",
      skills: (internship.required_skills ?? []).join(", "),
      location: internship.location ?? "",
      remote: internship.remote ?? false,
      duration_months: internship.duration_months?.toString() ?? "",
      stipend: internship.stipend?.toString() ?? "",
      status: internship.status ?? "open",
      deadline: toLocalInput(internship.application_deadline),
    });
    const chs = internship.internship_challenges ?? [];
    const cf: Record<string, ChallengeForm> = {};
    for (const c of chs) {
      cf[c.id] = {
        title: c.title,
        instructions: c.instructions ?? "",
        files: (c.required_files ?? []).join(", "),
        keywords: (c.required_keywords ?? []).join(", "),
      };
    }
    setChallengeForms(cf);
    setEditMode(true);
  };

  const saveEdit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("internships")
        .update({
          title: form.title.trim(),
          role: form.role.trim(),
          description: form.description,
          required_skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          location: form.location.trim() || null,
          remote: form.remote,
          duration_months: form.duration_months ? Number(form.duration_months) : null,
          stipend: form.stipend ? Number(form.stipend) : null,
          status: form.status as "open" | "closed",
          application_deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;

      for (const [cid, cf] of Object.entries(challengeForms)) {
        const { error: e2 } = await supabase
          .from("internship_challenges")
          .update({
            title: cf.title.trim(),
            instructions: cf.instructions.trim() || null,
            required_files: cf.files.split(",").map((s) => s.trim()).filter(Boolean),
            required_keywords: cf.keywords.split(",").map((s) => s.trim()).filter(Boolean),
          })
          .eq("id", cid);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Internship updated");
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["internship", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const deleteInternship = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("internships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Internship deleted");
      qc.invalidateQueries({ queryKey: ["company-dashboard"] });
      router.back();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const confirmDelete = () => {
    if (!internship) return;
    Alert.alert(
      "Delete this internship?",
      `This permanently removes "${internship.title}", its challenge, and every application to it. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteInternship.mutate() },
      ],
    );
  };

  if (isLoading || !internship) {
    return (
      <Screen>
        <Header title="Internship" back />
        <Loading />
      </Screen>
    );
  }

  const company = internship.companies;
  const challenges = internship.internship_challenges ?? [];

  const score = student
    ? calculateMatchScore({
        studentSkills: student.skills ?? [],
        studentRole: student.desired_role,
        studentProgress: student.progress_percentage ?? 0,
        requiredSkills: internship.required_skills ?? [],
        internshipRole: internship.role,
      })
    : 0;

  const isOwner = user?.id === internship.company_id;
  const applied = !!existingApp;
  const pending = applied && existingApp?.status === "pending";
  const deadlinePassed = isDeadlinePassed(internship.application_deadline);
  const closed = internship.status !== "open" || deadlinePassed;
  const showForm = role === "student" && !closed && (!applied || (pending && editing));

  return (
    <Screen>
      <Header title={internship.title} back />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">{internship.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Building2 size={15} color={colors.textMuted} />
              <Text variant="muted" numberOfLines={1} style={{ flex: 1 }}>{company?.company_name} · {internship.role}</Text>
            </View>
          </View>
          {role === "student" ? <MatchRing score={score} size={72} showLabel /> : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md }}>
          {internship.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MapPin size={14} color={colors.textMuted} />
              <Text variant="caption">{internship.location}</Text>
            </View>
          ) : null}
          {internship.remote ? <Badge label="Remote" variant="accent" /> : null}
          {internship.duration_months ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Clock size={14} color={colors.textMuted} />
              <Text variant="caption">{internship.duration_months} months</Text>
            </View>
          ) : null}
          {internship.stipend ? <Text variant="caption">${internship.stipend}/mo</Text> : null}
          {internship.application_deadline && !deadlinePassed ? (
            <Badge label={`Deadline: ${new Date(internship.application_deadline).toLocaleDateString()}`} variant="muted" />
          ) : null}
          {closed ? <Badge label="Closed" variant="destructive" /> : null}
        </View>

        {role === "student" && applied ? (
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg,
              padding: spacing.md, borderRadius: 14,
              backgroundColor: colors.success + "1A", borderWidth: 1, borderColor: colors.success + "44",
            }}
          >
            <CheckCircle2 size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="700">Applied · status {existingApp?.status}</Text>
              <Text variant="caption" numberOfLines={1}>
                {existingSub?.github_url ? `Submitted: ${existingSub.github_url}` : "GitHub link pending."}
              </Text>
            </View>
            {pending && !editing ? (
              <Button title="Edit link" variant="outline" size="sm" icon={<Edit3 size={14} color={colors.text} />} onPress={() => setEditing(true)} />
            ) : null}
          </View>
        ) : null}

        {isOwner ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button
              title="View applicants"
              variant="outline"
              icon={<Trophy size={16} color={colors.text} />}
              onPress={() => router.push("/(app)/(tabs)/browse")}
            />
            {!editMode ? (
              <>
                <Button title="Edit internship" variant="outline" icon={<Edit3 size={16} color={colors.text} />} onPress={startEdit} />
                <Button title="Delete" variant="destructive" icon={<Trash2 size={16} color={colors.onDestructive} />} onPress={confirmDelete} loading={deleteInternship.isPending} />
              </>
            ) : (
              <>
                <Button
                  title={saveEdit.isPending ? "Saving…" : "Save changes"}
                  icon={<Save size={16} color={colors.onPrimary} />}
                  onPress={() => saveEdit.mutate()}
                  loading={saveEdit.isPending}
                />
                <Button title="Cancel" variant="ghost" onPress={() => setEditMode(false)} disabled={saveEdit.isPending} />
              </>
            )}
          </View>
        ) : null}
      </Card>

      {editMode ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md }}>
              <Edit3 size={16} color={colors.primary} />
              <Text variant="h3">Edit internship details</Text>
            </View>
            <View style={{ gap: spacing.md }}>
              <Input label="Title" value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} />
              <Input label="Role" value={form.role} onChangeText={(t) => setForm((f) => ({ ...f, role: t }))} />
              <Input label="Description" value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} multiline />
              <Input label="Required skills (comma-separated)" value={form.skills} onChangeText={(t) => setForm((f) => ({ ...f, skills: t }))} placeholder="React, TypeScript, CSS" autoCapitalize="none" />
              <Input label="Location" value={form.location} onChangeText={(t) => setForm((f) => ({ ...f, location: t }))} />
              <Select
                label="Remote"
                value={form.remote ? "yes" : "no"}
                options={[{ label: "Remote", value: "yes" }, { label: "On-site", value: "no" }]}
                onChange={(v) => setForm((f) => ({ ...f, remote: v === "yes" }))}
              />
              <Input label="Duration (months)" value={form.duration_months} onChangeText={(t) => setForm((f) => ({ ...f, duration_months: t }))} keyboardType="numeric" />
              <Input label="Stipend ($/mo)" value={form.stipend} onChangeText={(t) => setForm((f) => ({ ...f, stipend: t }))} keyboardType="numeric" />
              <Select
                label="Status"
                value={form.status}
                options={[{ label: "Open", value: "open" }, { label: "Closed", value: "closed" }]}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              />
              <Input
                label="Application deadline (optional)"
                hint="Format: YYYY-MM-DDTHH:mm. Applications close automatically after this date. Leave empty for no deadline."
                value={form.deadline}
                onChangeText={(t) => setForm((f) => ({ ...f, deadline: t }))}
                placeholder="2026-12-31T17:00"
                autoCapitalize="none"
              />
            </View>
          </Card>

          {challenges.map((c) => {
            const cf = challengeForms[c.id];
            if (!cf) return null;
            return (
              <Card key={c.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md }}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text variant="h3">Edit challenge</Text>
                </View>
                <View style={{ gap: spacing.md }}>
                  <Input label="Challenge title" value={cf.title} onChangeText={(t) => setChallengeForms((p) => ({ ...p, [c.id]: { ...p[c.id], title: t } }))} />
                  <Input
                    label="Instructions"
                    value={cf.instructions}
                    onChangeText={(t) => setChallengeForms((p) => ({ ...p, [c.id]: { ...p[c.id], instructions: t } }))}
                    placeholder="Step-by-step requirements, deliverables, constraints…"
                    multiline
                  />
                  <Input
                    label="Required files (comma-separated)"
                    value={cf.files}
                    onChangeText={(t) => setChallengeForms((p) => ({ ...p, [c.id]: { ...p[c.id], files: t } }))}
                    placeholder="README.md, package.json"
                    autoCapitalize="none"
                  />
                  <Input
                    label="Required keywords (comma-separated)"
                    value={cf.keywords}
                    onChangeText={(t) => setChallengeForms((p) => ({ ...p, [c.id]: { ...p[c.id], keywords: t } }))}
                    placeholder="react, useState, fetch"
                    autoCapitalize="none"
                  />
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>About this internship</Text>
            <Text variant="muted">{internship.description}</Text>
          </Card>

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>Required skills</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(internship.required_skills ?? []).map((s) => (
                <Badge key={s} label={s} variant="muted" />
              ))}
            </View>
          </Card>

          {challenges.length > 0 ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm }}>
                <Sparkles size={16} color={colors.primary} />
                <Text variant="h3">Internship challenge</Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                {challenges.map((c) => (
                  <View
                    key={c.id}
                    style={{ padding: spacing.md, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.cardBorder }}
                  >
                    <Text variant="body" weight="700">{c.title}</Text>
                    {c.instructions ? (
                      <View style={{ marginTop: spacing.sm }}>
                        <Text variant="label" style={{ marginBottom: 4 }}>INSTRUCTIONS</Text>
                        <Text variant="muted">{c.instructions}</Text>
                      </View>
                    ) : (
                      <Text variant="muted" style={{ marginTop: 4 }}>No instructions provided yet.</Text>
                    )}
                    {c.required_files && c.required_files.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                        {c.required_files.map((f) => <Badge key={f} label={f} variant="muted" />)}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {showForm && challenges.length > 0 ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm }}>
                <GitBranch size={16} color={colors.primary} />
                <Text variant="h3">{pending ? "Edit your GitHub submission" : "Apply with GitHub repository"}</Text>
              </View>
              <Text variant="muted" style={{ marginBottom: spacing.md }}>
                Paste the public GitHub repo with your solution. We'll fetch it, run automated checks, and generate a recruiter-style evaluation.
              </Text>
              <View style={{ gap: spacing.md }}>
                <Input
                  label="GitHub repository URL"
                  placeholder="https://github.com/you/your-repo"
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Button
                    title={submitting ? "Analyzing repo…" : pending ? "Update submission" : "Apply now"}
                    onPress={() => apply.mutate()}
                    loading={apply.isPending || submitting}
                    style={{ flex: 1 }}
                  />
                  {pending ? <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} /> : null}
                </View>
              </View>
            </Card>
          ) : null}

          {showForm && challenges.length === 0 ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm }}>
                <GitBranch size={16} color={colors.primary} />
                <Text variant="h3">Apply with GitHub repository</Text>
              </View>
              <Text variant="muted" style={{ marginBottom: spacing.md }}>
                Paste a public GitHub repo so the company can review your work.
              </Text>
              <View style={{ gap: spacing.md }}>
                <Input
                  label="GitHub repository URL"
                  placeholder="https://github.com/you/your-repo"
                  value={githubUrl}
                  onChangeText={setGithubUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Button title="Apply now" onPress={() => apply.mutate()} loading={apply.isPending} fullWidth />
              </View>
            </Card>
          ) : null}

          {role === "student" && applied && challenges.length === 0 ? (
            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>No challenge required</Text>
              <Text variant="muted">Your application is in. The company will reach out directly.</Text>
            </Card>
          ) : null}

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>About the company</Text>
            <Text variant="muted">{company?.description ?? "No company description yet."}</Text>
            {company?.website ? (
              <Button
                title="Visit website"
                variant="ghost"
                size="sm"
                onPress={() => WebBrowser.openBrowserAsync(company.website!)}
                style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
              />
            ) : null}
          </Card>
        </View>
      )}
    </Screen>
  );
}
