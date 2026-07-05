import { useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Inbox, GraduationCap, GitBranch, Users, ExternalLink, ChevronDown, ChevronRight } from "lucide-react-native";
import {
  Screen, Header, Card, Text, Button, Badge, SearchBar, EmptyState, Loading, useToast,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

interface Submission { score: number; github_url: string | null; status: string }
interface AppRow {
  id: string;
  internship_id: string;
  student_id: string;
  match_score: number;
  status: string;
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
  students: { skills: string[] | null; desired_role: string | null; university: string | null; github_username: string | null } | null;
  sub: Submission | null;
}
interface InternshipRow {
  id: string;
  title: string;
  role: string | null;
  status: string;
  internship_challenges: { id: string }[] | null;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  accepted: "success",
  rejected: "destructive",
  reviewed: "primary",
  pending: "muted",
};

export function CompanyApplicants() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["company-applicants-hub", user?.id],
    queryFn: async () => {
      const { data: internshipsData } = await supabase
        .from("internships")
        .select("id,title,role,status,internship_challenges(id)")
        .eq("company_id", user!.id)
        .order("created_at", { ascending: false });

      const list = (internshipsData ?? []) as unknown as InternshipRow[];
      const ids = list.map((i) => i.id);

      const internshipChallenge = new Map<string, string>();
      for (const i of list) {
        const ch = i.internship_challenges?.[0]?.id;
        if (ch) internshipChallenge.set(i.id, ch);
      }

      let applicants: Omit<AppRow, "sub">[] = [];
      if (ids.length) {
        const { data: rows } = await supabase
          .from("applications")
          .select(
            "id,internship_id,student_id,match_score,status,profiles:profiles!applications_student_profile_fkey(full_name,email,avatar_url),students:students!applications_student_id_fkey(skills,desired_role,university,github_username)",
          )
          .in("internship_id", ids);
        applicants = (rows ?? []) as unknown as Omit<AppRow, "sub">[];
      }

      const challengeIds = [...new Set(internshipChallenge.values())];
      const subMap = new Map<string, Submission>();
      if (challengeIds.length) {
        const { data: subs } = await supabase
          .from("challenge_submissions")
          .select("student_id,internship_challenge_id,score,status,github_url")
          .in("internship_challenge_id", challengeIds);
        for (const su of subs ?? []) {
          subMap.set(`${su.internship_challenge_id}__${su.student_id}`, {
            score: su.score, github_url: su.github_url, status: su.status,
          });
        }
      }

      const byInternship = new Map<string, AppRow[]>();
      for (const r of applicants) {
        const chId = internshipChallenge.get(r.internship_id);
        const sub = chId ? subMap.get(`${chId}__${r.student_id}`) ?? null : null;
        const arr = byInternship.get(r.internship_id) ?? [];
        arr.push({ ...r, sub });
        byInternship.set(r.internship_id, arr);
      }
      for (const arr of byInternship.values()) {
        arr.sort((a, b) => ((b.sub?.score ?? 0) + b.match_score) - ((a.sub?.score ?? 0) + a.match_score));
      }

      return { internships: list, byInternship };
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: "accepted" | "rejected" }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "accepted" ? "Applicant accepted" : "Applicant rejected");
      qc.invalidateQueries({ queryKey: ["company-applicants-hub"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const onRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["company-applicants-hub", user?.id] });
  }, [qc, user?.id]);

  const toggle = (id: string) =>
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (isLoading && !data) return <Screen scroll={false}><Loading /></Screen>;

  const term = q.trim().toLowerCase();

  return (
    <Screen refreshing={isLoading} onRefresh={onRefresh}>
      <Header
        title="Applicants"
        subtitle="Your internships and everyone who applied, ranked by match + challenge."
        icon={<Inbox size={22} color={colors.primary} />}
      />
      <SearchBar value={q} onChangeText={setQ} placeholder="Search applicants…" />

      {!data?.internships.length ? (
        <View style={{ marginTop: spacing.lg }}>
          <EmptyState
            title="No internships yet"
            description="Post your first internship to start collecting applications."
          />
        </View>
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {data.internships.map((i) => {
            const all = data.byInternship.get(i.id) ?? [];
            const applicants = term
              ? all.filter((a) => {
                  const p = a.profiles;
                  const s = a.students;
                  return (
                    p?.full_name?.toLowerCase().includes(term) ||
                    p?.email?.toLowerCase().includes(term) ||
                    i.title?.toLowerCase().includes(term) ||
                    s?.desired_role?.toLowerCase().includes(term) ||
                    a.status?.toLowerCase().includes(term)
                  );
                })
              : all;
            if (term && applicants.length === 0) return null;
            const expanded = openItems.includes(i.id);

            return (
              <Card key={i.id} padded={false}>
                <Pressable
                  onPress={() => toggle(i.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1}>{i.title}</Text>
                    {i.role ? <Text variant="caption" style={{ marginTop: 2 }}>{i.role}</Text> : null}
                  </View>
                  <Badge
                    label={`${applicants.length} applicant${applicants.length === 1 ? "" : "s"}`}
                    variant="primary"
                    icon={<Users size={12} color={colors.primary} />}
                  />
                  {expanded ? <ChevronDown size={20} color={colors.textFaint} /> : <ChevronRight size={20} color={colors.textFaint} />}
                </Pressable>

                {expanded ? (
                  <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
                    {applicants.length === 0 ? (
                      <Text variant="muted">No applicants yet.</Text>
                    ) : (
                      applicants.map((a, idx) => {
                        const p = a.profiles;
                        const s = a.students;
                        const name = p?.full_name ?? p?.email ?? "Student";
                        const actionable = a.status === "pending" || a.status === "reviewed";
                        return (
                          <View
                            key={a.id}
                            style={{
                              backgroundColor: colors.surface,
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: colors.border,
                              padding: spacing.md,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                                <Text weight="800" color="primary">#{idx + 1}</Text>
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Pressable
                                  onPress={() => router.push(`/(app)/students/${a.student_id}`)}
                                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                                >
                                  <Text variant="body" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Text>
                                  {s?.github_username ? <GitBranch size={14} color={colors.textMuted} /> : null}
                                </Pressable>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                                  <Text variant="caption">{s?.desired_role ?? "—"}</Text>
                                  {s?.university ? (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                      <GraduationCap size={12} color={colors.textMuted} />
                                      <Text variant="caption">{s.university}</Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                              <View style={{ flexDirection: "row", gap: spacing.md }}>
                                <View style={{ alignItems: "center" }}>
                                  <Text weight="800" color="primary" style={{ fontSize: 18 }}>{a.match_score}%</Text>
                                  <Text variant="caption">match</Text>
                                </View>
                                {a.sub ? (
                                  <View style={{ alignItems: "center" }}>
                                    <Text weight="800" style={{ fontSize: 18 }}>{a.sub.score}<Text variant="caption">/100</Text></Text>
                                    <Text variant="caption">challenge</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {!!s?.skills?.length && (
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                                {s.skills.slice(0, 5).map((sk) => <Badge key={sk} label={sk} variant="muted" />)}
                              </View>
                            )}

                            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" }}>
                              {a.sub?.github_url ? (
                                <Pressable
                                  onPress={() => WebBrowser.openBrowserAsync(a.sub!.github_url!)}
                                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                                >
                                  <GitBranch size={13} color={colors.primary} />
                                  <Text variant="caption" color="primary" weight="700">Repo</Text>
                                  <ExternalLink size={12} color={colors.primary} />
                                </Pressable>
                              ) : null}
                              {actionable ? (
                                <View style={{ flexDirection: "row", gap: spacing.sm, marginLeft: "auto" }}>
                                  <Button
                                    title="Accept"
                                    size="sm"
                                    disabled={updateStatus.isPending}
                                    onPress={() => updateStatus.mutate({ appId: a.id, status: "accepted" })}
                                  />
                                  <Button
                                    title="Reject"
                                    variant="outline"
                                    size="sm"
                                    disabled={updateStatus.isPending}
                                    onPress={() => updateStatus.mutate({ appId: a.id, status: "rejected" })}
                                  />
                                </View>
                              ) : (
                                <View style={{ marginLeft: "auto" }}>
                                  <Badge label={a.status} variant={STATUS_VARIANT[a.status] ?? "muted"} />
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
