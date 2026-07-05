import { useEffect } from "react";
import { View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { GitBranch, GraduationCap, MapPin, ExternalLink, Trophy, Eye, Briefcase } from "lucide-react-native";
import { Screen, Header, Card, Text, Badge, Stat, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { StudentFeed } from "@/components/StudentFeed";

export function StudentProfileView({ id }: { id: string }) {
  const { colors, spacing } = useTheme();
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["student-view", id],
    queryFn: async () => {
      const [s, p, subs] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).maybeSingle(),
        supabase.from("profiles").select("full_name,email,avatar_url").eq("id", id).maybeSingle(),
        supabase.from("challenge_submissions").select("id,score,status,submitted_at").eq("student_id", id).order("submitted_at", { ascending: false }).limit(10),
      ]);
      return {
        student: s.data,
        profile: p.data,
        submissions: (subs.data ?? []) as Array<{ score: number }>,
      };
    },
  });

  // Record a profile view when a company looks at someone else's profile.
  useEffect(() => {
    if (!user || role !== "company" || user.id === id) return;
    supabase
      .from("profile_views")
      .upsert(
        { viewer_id: user.id, viewed_id: id, created_at: new Date().toISOString() },
        { onConflict: "viewer_id,viewed_id" },
      )
      .then(({ error }) => {
        if (error) console.error("[profile_views] upsert failed", error);
      });
  }, [user, role, id]);

  if (isLoading || !data?.student) {
    return (
      <Screen>
        <Header title="Student" back />
        <Loading />
      </Screen>
    );
  }

  const s = data.student as Record<string, unknown> & {
    skills?: string[]; bio?: string; desired_role?: string; university?: string;
    location?: string; github_username?: string; portfolio_url?: string; progress_percentage?: number;
  };
  const p = data.profile;
  const name = p?.full_name ?? p?.email ?? "Student";
  const avgScore = data.submissions.length
    ? Math.round(data.submissions.reduce((a, x) => a + (x.score ?? 0), 0) / data.submissions.length)
    : 0;

  return (
    <Screen>
      <Header title={name} back />

      {/* Header card */}
      <Card padded>
        <Text variant="title" numberOfLines={1}>{name}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
          {s.desired_role ? <Text variant="caption">{s.desired_role}</Text> : null}
          {s.university ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <GraduationCap size={13} color={colors.textFaint} />
              <Text variant="caption">{s.university}</Text>
            </View>
          ) : null}
          {s.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MapPin size={13} color={colors.textFaint} />
              <Text variant="caption">{s.location}</Text>
            </View>
          ) : null}
          {s.github_username ? (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(`https://github.com/${s.github_username}`)}
              hitSlop={6}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <GitBranch size={13} color={colors.primary} />
              <Text variant="caption" color="primary" weight="600">@{s.github_username}</Text>
            </Pressable>
          ) : null}
          {s.portfolio_url ? (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(s.portfolio_url!)}
              hitSlop={6}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <ExternalLink size={13} color={colors.primary} />
              <Text variant="caption" color="primary" weight="600">Portfolio</Text>
            </Pressable>
          ) : null}
        </View>
        {s.bio ? <Text variant="muted" style={{ marginTop: spacing.md }}>{s.bio}</Text> : null}
        {s.skills?.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md }}>
            {s.skills.map((sk) => <Badge key={sk} label={sk} variant="muted" />)}
          </View>
        ) : null}
      </Card>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }}>
        <View style={{ flexBasis: "31%", flexGrow: 1 }}>
          <Stat icon={<Trophy size={14} color={colors.violet} />} label="Challenge avg" value={`${avgScore}/100`} />
        </View>
        <View style={{ flexBasis: "31%", flexGrow: 1 }}>
          <Stat icon={<Briefcase size={14} color={colors.violet} />} label="Profile strength" value={`${s.progress_percentage ?? 0}%`} />
        </View>
        <View style={{ flexBasis: "31%", flexGrow: 1 }}>
          <Stat icon={<Eye size={14} color={colors.violet} />} label="Submissions" value={data.submissions.length} />
        </View>
      </View>

      {/* Portfolio feed */}
      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Text variant="h3">Portfolio feed</Text>
        <StudentFeed studentId={id} editable={id === user?.id} authorName={name} />
      </View>
    </Screen>
  );
}
