import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, MapPin, Clock, CheckCircle2 } from "lucide-react-native";
import {
  Screen, Header, Card, Text, Badge, SearchBar, CompanyMark, MatchBadge, EmptyState, Loading,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/matching";
import { NotificationBell } from "@/components/NotificationBell";

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
  companies: { company_name: string } | null;
}

type RankedInternship = InternshipRow & { score: number };

export function StudentHome() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data: student } = useQuery({
    queryKey: ["dash-student", user?.id],
    queryFn: async () =>
      (await supabase
        .from("students")
        .select("skills,desired_role,progress_percentage,field")
        .eq("id", user!.id)
        .maybeSingle()).data,
    enabled: !!user,
  });

  const { data: internships, isLoading } = useQuery({
    queryKey: ["dash-internships-open"],
    queryFn: async () =>
      ((await supabase
        .from("internships")
        .select("id,title,role,description,required_skills,location,remote,duration_months,stipend,companies(company_name)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50)).data ?? []) as unknown as InternshipRow[],
  });

  const { data: myApplications } = useQuery({
    queryKey: ["dash-my-applications", user?.id],
    queryFn: async () =>
      ((await supabase
        .from("applications")
        .select("internship_id,status")
        .eq("student_id", user!.id)).data ?? []) as { internship_id: string; status: string }[],
    enabled: !!user,
  });

  const appliedIds = new Set((myApplications ?? []).map((a) => a.internship_id));

  const query = q.trim().toLowerCase();
  const ranked: RankedInternship[] = (internships ?? [])
    .filter((i) =>
      !query ||
      i.title.toLowerCase().includes(query) ||
      (i.role ?? "").toLowerCase().includes(query) ||
      (i.companies?.company_name ?? "").toLowerCase().includes(query) ||
      (i.description ?? "").toLowerCase().includes(query),
    )
    .map((i) => ({
      ...i,
      score: student
        ? calculateMatchScore({
            studentSkills: student.skills ?? [],
            studentRole: student.desired_role,
            studentProgress: student.progress_percentage ?? 0,
            requiredSkills: i.required_skills ?? [],
            internshipRole: i.role,
          })
        : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topMatches = ranked.filter((i) => i.score >= 50).slice(0, 6);
  const others = ranked.filter((i) => i.score < 50).slice(0, 6);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["dash-internships-open"] }),
      qc.invalidateQueries({ queryKey: ["dash-student", user?.id] }),
      qc.invalidateQueries({ queryKey: ["dash-my-applications", user?.id] }),
    ]);
  }, [qc, user?.id]);

  const fullName = user?.user_metadata?.full_name as string | undefined;

  return (
    <Screen refreshing={isLoading} onRefresh={onRefresh}>
      <Header
        title="Internships made for you"
        subtitle={`Ranked using your ${student?.field ?? "profile"} skills, role, and progress.`}
        right={<NotificationBell />}
      />

      <Text variant="muted" style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
        Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}.
      </Text>

      <SearchBar value={q} onChangeText={setQ} placeholder="Search internships…" />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xl, marginBottom: spacing.md }}>
        <Sparkles size={18} color={colors.primary} />
        <Text variant="h2">Top matches</Text>
      </View>

      {isLoading ? (
        <Loading />
      ) : topMatches.length === 0 ? (
        <EmptyState
          title="No top matches yet"
          description="Complete platform challenges and update your skills to improve matching."
          actionLabel="Edit profile"
          onAction={() => router.push("/(app)/profile")}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {topMatches.map((i) => (
            <InternshipCard key={i.id} internship={i} applied={appliedIds.has(i.id)} onPress={() => router.push(`/(app)/internships/${i.id}`)} />
          ))}
        </View>
      )}

      {others.length > 0 ? (
        <>
          <Text variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>More opportunities</Text>
          <View style={{ gap: spacing.md }}>
            {others.map((i) => (
              <InternshipCard key={i.id} internship={i} applied={appliedIds.has(i.id)} onPress={() => router.push(`/(app)/internships/${i.id}`)} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function InternshipCard({
  internship: i,
  applied,
  onPress,
}: {
  internship: RankedInternship;
  applied: boolean;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  const company = i.companies?.company_name;

  return (
    <Card onPress={onPress} highlight={applied}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
        <CompanyMark name={company} size={44} />
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <MatchBadge score={i.score} />
          {applied ? (
            <Badge label="Applied" variant="success" icon={<CheckCircle2 size={12} color={colors.success} />} />
          ) : null}
        </View>
      </View>

      <Text variant="caption" style={{ marginTop: spacing.md }}>{company}</Text>
      <Text variant="h3" numberOfLines={1} style={{ marginTop: 2 }}>{i.title}</Text>
      <Text variant="caption" style={{ marginTop: 2 }}>{i.role}</Text>
      <Text variant="muted" numberOfLines={2} style={{ marginTop: spacing.sm }}>{i.description}</Text>

      {i.required_skills && i.required_skills.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
          {i.required_skills.slice(0, 4).map((s) => (
            <Badge key={s} label={s} variant="muted" />
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, flexWrap: "wrap" }}>
        {i.remote ? (
          <Badge label="Remote" variant="accent" />
        ) : i.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={13} color={colors.textMuted} />
            <Text variant="caption">{i.location}</Text>
          </View>
        ) : null}
        {i.duration_months ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={13} color={colors.textMuted} />
            <Text variant="caption">{i.duration_months}mo</Text>
          </View>
        ) : null}
        {i.stipend ? (
          <Text variant="caption" weight="700" color="text" style={{ marginLeft: "auto" }}>${i.stipend}/mo</Text>
        ) : null}
      </View>
    </Card>
  );
}
