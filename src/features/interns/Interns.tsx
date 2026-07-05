import { View } from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Users, MessageSquare, GitBranch } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { Screen, Header, Card, Text, Badge, Button, Avatar, SearchBar, EmptyState, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { threadId } from "@/lib/utils";

type InternRow = {
  id: string;
  created_at: string;
  internship_id: string;
  student_id: string;
  internships: { title: string; company_id: string } | null;
  students: {
    skills: string[] | null;
    desired_role: string | null;
    github_username: string | null;
    university: string | null;
  } | null;
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

export function Interns() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["company-interns", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select(
          "id,created_at,internship_id,student_id,internships!inner(title,company_id),students:students!applications_student_id_fkey(skills,desired_role,github_username,university),profiles:profiles!applications_student_profile_fkey(full_name,email,avatar_url)",
        )
        .eq("status", "accepted")
        .eq("internships.company_id", user!.id)
        .order("created_at", { ascending: false });
      // Dedupe by student_id — same person across multiple internships shows once.
      const seen = new Set<string>();
      return ((data ?? []) as unknown as InternRow[]).filter((a) => {
        if (seen.has(a.student_id)) return false;
        seen.add(a.student_id);
        return true;
      });
    },
    enabled: !!user,
  });

  const term = q.trim().toLowerCase();
  const filtered = term
    ? (data ?? []).filter((a) => {
        return (
          a.profiles?.full_name?.toLowerCase().includes(term) ||
          a.profiles?.email?.toLowerCase().includes(term) ||
          a.internships?.title?.toLowerCase().includes(term) ||
          a.students?.desired_role?.toLowerCase().includes(term)
        );
      })
    : data ?? [];

  return (
    <Screen>
      <Header
        back
        title="Interns"
        subtitle="Students you've accepted across all your internships."
        icon={<Users size={22} color={colors.primary} />}
      />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search interns…" />

      {isLoading ? (
        <Loading />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Users size={26} color={colors.textMuted} />}
          title={q.trim() ? "No matching interns" : "No interns yet"}
          description={q.trim() ? "Try a different search." : "Accept applicants and they'll appear here."}
        />
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          {filtered.map((a) => {
            const name = a.profiles?.full_name ?? a.profiles?.email;
            const skills = a.students?.skills ?? [];
            const tid = threadId(a.internship_id, a.student_id);
            return (
              <Card key={a.id} padded>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <Avatar name={a.profiles?.full_name} email={a.profiles?.email} size={48} gradient={colors.gradViolet} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      variant="h3"
                      numberOfLines={1}
                      onPress={() => router.push(`/(app)/students/${a.student_id}` as never)}
                    >
                      {name}
                    </Text>
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                      {a.students?.desired_role ?? "—"}
                      {a.students?.university ? ` · ${a.students.university}` : ""}
                    </Text>
                    <Text variant="caption" color="primary" style={{ marginTop: 2 }} numberOfLines={1}>
                      {a.internships?.title}
                    </Text>
                    {skills.length ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm }}>
                        {skills.slice(0, 5).map((sk) => (
                          <Badge key={sk} label={sk} variant="muted" />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    title="Message"
                    size="sm"
                    icon={<MessageSquare size={14} color={colors.onPrimary} />}
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/(app)/messages/${tid}` as never)}
                  />
                  {a.students?.github_username ? (
                    <Button
                      title="GitHub"
                      size="sm"
                      variant="outline"
                      icon={<GitBranch size={14} color={colors.text} />}
                      onPress={() => WebBrowser.openBrowserAsync(`https://github.com/${a.students!.github_username}`)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
