import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, GitBranch, CheckCircle2 } from "lucide-react-native";
import {
  Screen,
  Header,
  Text,
  Badge,
  SearchBar,
  Segmented,
  EmptyState,
  Loading,
  type BadgeVariant,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { useFields } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

const difficultyVariant = (d: string | null): BadgeVariant =>
  d === "easy" ? "success" : d === "medium" ? "accent" : "violet";

export function StudentChallenges() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: FIELDS = [] } = useFields();

  const [tab, setTab] = useState<"recommended" | "all">("recommended");
  const [q, setQ] = useState("");

  const { data: student } = useQuery({
    queryKey: ["student-challenges-filter", user?.id],
    queryFn: async () =>
      (await supabase.from("students").select("field,skills,desired_role").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["platform-challenges"],
    queryFn: async () => (await supabase.from("platform_challenges").select("*").order("difficulty")).data ?? [],
  });

  const { data: mine } = useQuery({
    queryKey: ["my-submissions", user?.id],
    queryFn: async () =>
      (
        await supabase
          .from("challenge_submissions")
          .select("platform_challenge_id,status,score")
          .eq("student_id", user!.id)
          .not("platform_challenge_id", "is", null)
      ).data ?? [],
    enabled: !!user,
  });

  const completed = new Map((mine ?? []).map((m) => [m.platform_challenge_id, m]));

  // Skills relevant to student: explicit skills + skills from their field
  const studentSkills = new Set((student?.skills ?? []).map((s) => s.toLowerCase()));
  if (student?.field) {
    const field = FIELDS.find((f) => f.id === student.field);
    field?.skills.forEach((s) => studentSkills.add(s.toLowerCase()));
  }

  const showAll = tab === "all";
  const query = q.trim().toLowerCase();
  const filtered = (challenges ?? [])
    .filter((c) => showAll || studentSkills.size === 0 || studentSkills.has((c.skill ?? "").toLowerCase()))
    .filter(
      (c) =>
        !query ||
        c.title.toLowerCase().includes(query) ||
        (c.description ?? "").toLowerCase().includes(query) ||
        (c.skill ?? "").toLowerCase().includes(query),
    );

  return (
    <Screen>
      <Header
        title="Challenges"
        subtitle={showAll ? "Showing every challenge." : `Filtered to match your ${student?.field ?? "skills"}.`}
      />

      <Segmented
        options={[
          { key: "recommended", label: "Recommended" },
          { key: "all", label: "All" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as "recommended" | "all")}
      />

      <View style={{ marginTop: spacing.md }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search challenges…" />
      </View>

      {isLoading ? (
        <View style={{ marginTop: spacing.xl }}>
          <Loading />
        </View>
      ) : !filtered.length ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState
            icon={<Sparkles size={28} color={colors.primary} />}
            title="No matching challenges"
            description={showAll ? "Try a different search." : "Try showing all challenges instead."}
            actionLabel={showAll ? undefined : "Show all challenges"}
            onAction={showAll ? undefined : () => setTab("all")}
          />
        </View>
      ) : (
        <View
          style={{
            marginTop: spacing.lg,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: spacing.md,
          }}
        >
          {filtered.map((c) => {
            const sub = completed.get(c.id);
            const done = sub?.status === "validated";
            const attempted = !!sub && !done;
            return (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/(app)/challenges/${c.id}?type=platform` as never)}
                style={({ pressed }) => ({
                  width: "47%",
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: done ? colors.success : colors.cardBorder,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.85 : 1,
                  overflow: "hidden",
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: colors.violet + "1A",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles size={18} color={colors.violet} />
                  </View>
                  {done ? (
                    <Badge label="Done" variant="success" icon={<CheckCircle2 size={12} color={colors.success} />} />
                  ) : (
                    <Badge label={c.difficulty} variant={difficultyVariant(c.difficulty)} />
                  )}
                </View>

                <Text variant="h3" numberOfLines={2} style={{ marginTop: spacing.md }}>
                  {c.title}
                </Text>
                <Text variant="muted" numberOfLines={2} style={{ marginTop: 4 }}>
                  {c.description}
                </Text>

                <View style={{ marginTop: spacing.md, gap: 8 }}>
                  {c.skill ? <Badge label={c.skill} variant="muted" /> : null}
                  {done ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} color={colors.success} />
                      <Text variant="caption" color="success">
                        Completed · {sub!.score}%
                      </Text>
                    </View>
                  ) : attempted ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <GitBranch size={12} color={colors.warning} />
                      <Text variant="caption" color="warning">
                        Submitted · {sub!.score}%
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <GitBranch size={12} color={colors.textFaint} />
                      <Text variant="caption">Submit GitHub</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
