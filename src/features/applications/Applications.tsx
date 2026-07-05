import { View, Pressable } from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ClipboardList, GitBranch, ExternalLink } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen, Header, Card, Text, Badge, SearchBar, EmptyState, Loading } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

type ApplicationRow = {
  id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  internship_id: string;
  internships: {
    title: string;
    role: string;
    location: string | null;
    remote: boolean;
    companies: { company_name: string } | null;
  } | null;
};

type SubmissionRow = {
  internship_challenge_id: string | null;
  score: number | null;
  github_url: string | null;
  submitted_at: string | null;
  internship_challenges: { internship_id: string } | null;
};

function statusVariant(s: string): BadgeVariant {
  if (s === "accepted") return "success";
  if (s === "rejected") return "destructive";
  if (s === "reviewed") return "primary";
  return "warning";
}

export function Applications() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  const { data: apps, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select(
          "id,status,match_score,created_at,internship_id,internships(title,role,location,remote,companies(company_name))",
        )
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ApplicationRow[];
    },
    enabled: !!user,
  });

  const { data: subs } = useQuery({
    queryKey: ["my-internship-subs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("challenge_submissions")
        .select("internship_challenge_id,score,github_url,submitted_at,internship_challenges(internship_id)")
        .eq("student_id", user!.id)
        .not("internship_challenge_id", "is", null);
      return (data ?? []) as unknown as SubmissionRow[];
    },
    enabled: !!user,
  });

  const subByInternship = new Map<string | undefined, SubmissionRow>(
    (subs ?? []).map((s) => [s.internship_challenges?.internship_id, s]),
  );

  const query = q.trim().toLowerCase();
  const filtered = (apps ?? []).filter((a) => {
    if (!query) return true;
    const i = a.internships;
    return (
      i?.title?.toLowerCase().includes(query) ||
      i?.role?.toLowerCase().includes(query) ||
      i?.location?.toLowerCase().includes(query) ||
      i?.companies?.company_name?.toLowerCase().includes(query) ||
      a.status?.toLowerCase().includes(query)
    );
  });

  return (
    <Screen>
      <Header
        back
        title="My applications"
        subtitle="Track every internship you've applied to and your submission status."
        icon={<ClipboardList size={22} color={colors.primary} />}
      />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search applications…" />

      {isLoading ? (
        <Loading />
      ) : !apps?.length ? (
        <EmptyState
          icon={<ClipboardList size={26} color={colors.textMuted} />}
          title="No applications yet"
          description="Browse internships and apply to start your journey."
        />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {filtered.map((a) => {
            const i = a.internships;
            const sub = subByInternship.get(a.internship_id);
            const complete = !!sub;
            return (
              <Card key={a.id} padded onPress={() => router.push(`/(app)/internships/${a.internship_id}` as never)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1}>
                      {i?.title}
                    </Text>
                    <Text variant="caption" color="textMuted" style={{ marginTop: 2 }} numberOfLines={1}>
                      {i?.companies?.company_name} · {i?.role}
                      {i?.remote ? " · Remote" : i?.location ? ` · ${i.location}` : ""}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.sm }}>
                      <Badge label={a.status} variant={statusVariant(a.status)} />
                      <Text
                        variant="caption"
                        color={complete ? "success" : "textMuted"}
                        weight={complete ? "600" : "400"}
                      >
                        {complete ? "✓ Challenge submitted" : "Challenge pending"}
                      </Text>
                      {sub?.github_url ? (
                        <Pressable
                          onPress={() => WebBrowser.openBrowserAsync(sub.github_url!)}
                          hitSlop={6}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        >
                          <GitBranch size={12} color={colors.primary} />
                          <Text variant="caption" color="primary" weight="600">
                            Repo
                          </Text>
                          <ExternalLink size={12} color={colors.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="title" color="primary" weight="800">
                      {a.match_score}%
                    </Text>
                    <Text variant="caption" color="textMuted">
                      match
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
