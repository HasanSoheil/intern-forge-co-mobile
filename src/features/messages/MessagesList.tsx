import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MessageSquare } from "lucide-react-native";
import { Screen, Header, Card, Text, Avatar, SearchBar, EmptyState, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { threadId } from "@/lib/utils";

interface ThreadRow {
  internship_id: string;
  internship_title: string;
  other_id: string;
  other_name: string;
}

export function MessagesList() {
  const { colors, spacing } = useTheme();
  const { user, role } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  // Threads = accepted applications, DEDUPED by the other party. Multiple
  // internships with the same person collapse into ONE conversation, anchored on
  // the most recently accepted internship.
  const { data: threads, isLoading } = useQuery<ThreadRow[]>({
    queryKey: ["message-threads", user?.id, role],
    queryFn: async () => {
      const raw: ThreadRow[] = [];
      if (role === "company") {
        const { data } = await supabase
          .from("applications")
          .select("student_id,internship_id,created_at,internships!inner(title,company_id),profiles:profiles!applications_student_profile_fkey(full_name,email)")
          .eq("status", "accepted")
          .eq("internships.company_id", user!.id)
          .order("created_at", { ascending: false });
        for (const a of (data ?? []) as Array<Record<string, unknown>>) {
          const i = a.internships as { title: string };
          const p = a.profiles as { full_name: string | null; email: string } | null;
          raw.push({
            internship_id: a.internship_id as string,
            internship_title: i.title,
            other_id: a.student_id as string,
            other_name: p?.full_name ?? p?.email ?? "Student",
          });
        }
      } else {
        const { data } = await supabase
          .from("applications")
          .select("internship_id,created_at,internships(title,company_id,companies(company_name))")
          .eq("student_id", user!.id)
          .eq("status", "accepted")
          .order("created_at", { ascending: false });
        for (const a of (data ?? []) as Array<Record<string, unknown>>) {
          const i = a.internships as { title: string; company_id: string; companies: { company_name: string } | null };
          raw.push({
            internship_id: a.internship_id as string,
            internship_title: i.title,
            other_id: i.company_id,
            other_name: i.companies?.company_name ?? "Company",
          });
        }
      }
      // Dedupe by other_id — keep the first (most recent) occurrence.
      const seen = new Set<string>();
      return raw.filter((t) => { if (seen.has(t.other_id)) return false; seen.add(t.other_id); return true; });
    },
    enabled: !!user && !!role,
  });

  // Unread counts per other-party (messages addressed to me, not yet read).
  const { data: unreadBySender } = useQuery({
    queryKey: ["unread-messages-map", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", user!.id)
        .eq("read", false);
      const map: Record<string, number> = {};
      for (const m of data ?? []) map[m.sender_id] = (map[m.sender_id] ?? 0) + 1;
      return map;
    },
    enabled: !!user,
    refetchInterval: 15_000,
  });

  const query = q.trim().toLowerCase();
  const filtered = query
    ? threads?.filter((t) => `${t.other_name ?? ""} ${t.internship_title ?? ""}`.toLowerCase().includes(query))
    : threads;

  return (
    <Screen>
      <Header title="Messages" icon={<MessageSquare size={22} color={colors.primary} />} subtitle={`Chat with ${role === "company" ? "accepted students" : "companies that accepted you"}.`} />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search conversations…" />

      {isLoading ? (
        <Loading />
      ) : !threads?.length ? (
        <EmptyState
          icon={<MessageSquare size={26} color={colors.textMuted} />}
          title="No conversations"
          description="Once an application is accepted, a thread appears here."
        />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {filtered?.map((t) => {
            const tid = threadId(t.internship_id, t.other_id);
            const unread = unreadBySender?.[t.other_id] ?? 0;
            return (
              <Card key={tid} padded onPress={() => router.push(`/(app)/messages/${tid}` as never)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <Avatar name={t.other_name} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1} weight={unread > 0 ? "800" : "700"}>{t.other_name}</Text>
                    <Text variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>{t.internship_title}</Text>
                  </View>
                  {unread > 0 ? (
                    <View style={{ minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.onPrimary }}>{unread}</Text>
                    </View>
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
