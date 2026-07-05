import { useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Send, GitBranch, GraduationCap } from "lucide-react-native";
import {
  Screen, Header, Card, Text, Button, Badge, SearchBar, Select, EmptyState, Loading, CompanyMark, useToast,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/matching";

interface InternshipRow {
  id: string;
  title: string;
  role: string;
  required_skills: string[] | null;
}
interface StudentRow {
  id: string;
  skills: string[] | null;
  desired_role: string | null;
  field: string | null;
  github_username: string | null;
  university: string | null;
  progress_percentage: number | null;
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
}

export function CompanyMatched() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [internshipId, setInternshipId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data: internships, isLoading: loadingInternships } = useQuery({
    queryKey: ["company-internships", user?.id],
    queryFn: async () =>
      ((await supabase
        .from("internships")
        .select("id,title,role,required_skills")
        .eq("company_id", user!.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })).data ?? []) as unknown as InternshipRow[],
    enabled: !!user,
  });

  const selected = useMemo(
    () => internships?.find((i) => i.id === (internshipId ?? internships?.[0]?.id)),
    [internshipId, internships],
  );

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["all-students-for-match"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,skills,desired_role,field,github_username,university,progress_percentage,profiles:profiles!students_profile_fkey(full_name,email,avatar_url)")
        .gt("progress_percentage", 0)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as StudentRow[];
    },
  });

  const { data: existingInvites } = useQuery({
    queryKey: ["company-invites", user?.id, selected?.id],
    queryFn: async () =>
      ((await supabase
        .from("invitations")
        .select("student_id,status")
        .eq("company_id", user!.id)
        .eq("internship_id", selected!.id)).data ?? []) as { student_id: string; status: string }[],
    enabled: !!user && !!selected,
  });

  const invitedSet = useMemo(() => new Set(existingInvites?.map((i) => i.student_id)), [existingInvites]);

  const ranked = useMemo(
    () =>
      selected && students
        ? students
            .map((s) => ({
              ...s,
              score: calculateMatchScore({
                studentSkills: s.skills ?? [],
                studentRole: s.desired_role,
                studentProgress: s.progress_percentage ?? 0,
                requiredSkills: selected.required_skills ?? [],
                internshipRole: selected.role,
              }),
            }))
            .filter((s) => s.score >= 30)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)
        : [],
    [selected, students],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ranked;
    return ranked.filter((s) => {
      const p = s.profiles;
      return (
        p?.full_name?.toLowerCase().includes(term) ||
        p?.email?.toLowerCase().includes(term) ||
        s.desired_role?.toLowerCase().includes(term) ||
        s.field?.toLowerCase().includes(term) ||
        s.university?.toLowerCase().includes(term) ||
        s.skills?.some((sk) => sk?.toLowerCase().includes(term))
      );
    });
  }, [ranked, q]);

  const invite = useMutation({
    mutationFn: async (studentId: string) => {
      if (!selected) throw new Error("Pick an internship first");
      const { error } = await supabase.from("invitations").insert({
        company_id: user!.id,
        student_id: studentId,
        internship_id: selected.id,
        message: `We'd love you to apply for ${selected.title}.`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation sent!");
      qc.invalidateQueries({ queryKey: ["company-invites"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["company-internships", user?.id] }),
      qc.invalidateQueries({ queryKey: ["all-students-for-match"] }),
      qc.invalidateQueries({ queryKey: ["company-invites"] }),
    ]);
  }, [qc, user?.id]);

  const isLoading = loadingInternships || loadingStudents;
  if (isLoading && !internships) return <Screen scroll={false}><Loading /></Screen>;

  return (
    <Screen refreshing={isLoading} onRefresh={onRefresh}>
      <Header
        title="Matched students"
        subtitle="Top students ranked against your selected internship. Invite them directly."
        icon={<Users size={22} color={colors.primary} />}
      />

      {internships && internships.length > 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          <Select
            label="Rank against"
            value={selected?.id ?? null}
            options={internships.map((i) => ({ label: i.title, value: i.id }))}
            onChange={setInternshipId}
          />
        </View>
      ) : null}

      <SearchBar value={q} onChangeText={setQ} placeholder="Search students…" />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {!internships?.length ? (
          <EmptyState
            title="No open internships"
            description="Post an internship to see matched students here."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={q ? "No students match your search" : "No matches yet"}
            description={q ? "Try a different search term." : "Try adjusting required skills on this internship."}
          />
        ) : (
          filtered.map((s, idx) => {
            const p = s.profiles;
            const invited = invitedSet.has(s.id);
            const name = p?.full_name ?? p?.email ?? "Student";
            return (
              <Card key={s.id}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <CompanyMark name={`#${idx + 1}`} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Pressable
                      onPress={() => router.push(`/(app)/students/${s.id}`)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    >
                      <Text variant="body" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Text>
                      {s.github_username ? <GitBranch size={14} color={colors.textMuted} /> : null}
                    </Pressable>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <GraduationCap size={13} color={colors.textMuted} />
                      <Text variant="caption">{s.desired_role ?? s.field ?? "—"}</Text>
                    </View>
                    {s.university ? <Text variant="caption" style={{ marginTop: 2 }}>{s.university}</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text weight="800" color="primary" style={{ fontSize: 18 }}>{s.score}%</Text>
                    <Text variant="caption">match</Text>
                  </View>
                </View>

                {s.skills && s.skills.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                    {s.skills.slice(0, 6).map((sk) => <Badge key={sk} label={sk} variant="muted" />)}
                  </View>
                ) : null}

                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title="View profile" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => router.push(`/(app)/students/${s.id}`)} />
                  <Button
                    title={invited ? "Invited" : "Invite"}
                    size="sm"
                    style={{ flex: 1 }}
                    icon={invited ? undefined : <Send size={13} color={colors.onPrimary} />}
                    disabled={invited || invite.isPending}
                    onPress={() => invite.mutate(s.id)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
