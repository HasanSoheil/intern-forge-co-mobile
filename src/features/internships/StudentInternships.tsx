import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, CheckCircle2 } from "lucide-react-native";
import {
  Screen, Header, Card, Text, Badge, SearchBar, CompanyMark, MatchBadge, EmptyState, Loading,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/matching";
import { isDeadlinePassed } from "@/lib/utils";

interface InternshipRow {
  id: string;
  title: string;
  role: string;
  description: string;
  required_skills: string[] | null;
  location: string | null;
  remote: boolean;
  duration_months: number | null;
  stipend: number | null;
  company_id: string;
  application_deadline: string | null;
  status: string;
  companies: { company_name: string; logo_url: string | null } | null;
}

export function StudentInternships() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const [q, setQ] = useState("");

  const { data: student } = useQuery({
    queryKey: ["me-student", user?.id],
    queryFn: async () =>
      (await supabase
        .from("students")
        .select("skills,desired_role,progress_percentage")
        .eq("id", user!.id)
        .maybeSingle()).data,
    enabled: !!user && role === "student",
  });

  const { data: myApps } = useQuery({
    queryKey: ["my-apps-map", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("internship_id,status")
        .eq("student_id", user!.id);
      const map: Record<string, string> = {};
      for (const a of data ?? []) map[a.internship_id] = a.status;
      return map;
    },
    enabled: !!user && role === "student",
  });

  const { data: internships, isLoading } = useQuery({
    queryKey: ["internships-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("internships")
        .select("id,title,role,description,required_skills,location,remote,duration_months,stipend,company_id,application_deadline,status,companies(company_name,logo_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as InternshipRow[];
    },
  });

  const query = q.trim().toLowerCase();
  const list = (internships ?? [])
    .map((i) => ({
      ...i,
      score:
        role === "student" && student
          ? calculateMatchScore({
              studentSkills: student.skills ?? [],
              studentRole: student.desired_role,
              studentProgress: student.progress_percentage ?? 0,
              requiredSkills: i.required_skills ?? [],
              internshipRole: i.role,
            })
          : 0,
    }))
    .filter((i) => !query || i.title.toLowerCase().includes(query) || i.role.toLowerCase().includes(query))
    .sort((a, b) => b.score - a.score);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["internships-all"] }),
      qc.invalidateQueries({ queryKey: ["my-apps-map", user?.id] }),
      qc.invalidateQueries({ queryKey: ["me-student", user?.id] }),
    ]);
  }, [qc, user?.id]);

  return (
    <Screen refreshing={isLoading} onRefresh={onRefresh}>
      <Header title="Internships" subtitle="Ranked by match score for your profile." />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search roles…" />

      <View style={{ marginTop: spacing.lg }}>
        {isLoading ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState title="No internships yet" description="Check back soon — companies are posting daily." />
        ) : (
          <View style={{ gap: spacing.md }}>
            {list.map((i) => {
              const appStatus = myApps?.[i.id];
              const closed = isDeadlinePassed(i.application_deadline);
              return (
                <Card key={i.id} onPress={() => router.push(`/(app)/internships/${i.id}`)} highlight={!!appStatus}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        <CompanyMark name={i.companies?.company_name} size={44} />
                        <View style={{ flex: 1 }}>
                          <Text variant="h3" numberOfLines={1}>{i.title}</Text>
                          <Text variant="muted" numberOfLines={1}>{i.companies?.company_name} · {i.role}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                        {appStatus ? (
                          <Badge
                            label={appStatus === "pending" ? "Applied" : appStatus === "reviewed" ? "Under review" : appStatus}
                            variant="success"
                            icon={<CheckCircle2 size={12} color={colors.success} />}
                          />
                        ) : null}
                        {closed ? <Badge label="Closed" variant="destructive" /> : null}
                      </View>

                      <Text variant="muted" numberOfLines={2} style={{ marginTop: spacing.sm }}>{i.description}</Text>

                      {i.required_skills && i.required_skills.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
                          {i.required_skills.slice(0, 4).map((s) => (
                            <Badge key={s} label={s} variant="muted" />
                          ))}
                        </View>
                      ) : null}

                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" }}>
                        {i.location ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <MapPin size={13} color={colors.textMuted} />
                            <Text variant="caption">{i.location}</Text>
                          </View>
                        ) : null}
                        {i.remote ? <Badge label="Remote" variant="accent" /> : null}
                        {i.duration_months ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Clock size={13} color={colors.textMuted} />
                            <Text variant="caption">{i.duration_months}mo</Text>
                          </View>
                        ) : null}
                        {i.stipend ? <Text variant="caption">${i.stipend}/mo</Text> : null}
                      </View>
                    </View>

                    {role === "student" && student ? (
                      <View style={{ alignItems: "flex-end" }}>
                        <MatchBadge score={i.score} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
