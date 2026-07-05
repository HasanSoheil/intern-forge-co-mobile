import { View } from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Send, Users, Briefcase, Clock } from "lucide-react-native";
import { Screen, Header, Card, Text, Badge, Button, SearchBar, Segmented, EmptyState, Loading } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { capitalize } from "@/lib/utils";

type SentInvitationRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  internship_id: string;
  student_id: string;
  internships: { title: string } | null;
  profiles: { full_name: string | null; email: string } | null;
};

type Filter = "all" | "pending" | "accepted" | "declined";

function statusVariant(s: string): BadgeVariant {
  if (s === "accepted") return "accent";
  if (s === "declined") return "destructive";
  return "muted";
}

export function SentInvitations() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sent-invites", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select(
          "id,status,message,created_at,internship_id,internships(title),profiles:profiles!invitations_student_profile_fkey(full_name,email),student_id",
        )
        .eq("company_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as SentInvitationRow[];
    },
    enabled: !!user,
  });

  const counts = {
    all: data?.length ?? 0,
    pending: data?.filter((i) => i.status === "pending").length ?? 0,
    accepted: data?.filter((i) => i.status === "accepted").length ?? 0,
    declined: data?.filter((i) => i.status === "declined").length ?? 0,
  };

  const term = q.trim().toLowerCase();
  const visible = (data ?? [])
    .filter((i) => filter === "all" || i.status === filter)
    .filter((inv) => {
      if (!term) return true;
      return (
        inv.profiles?.full_name?.toLowerCase().includes(term) ||
        inv.profiles?.email?.toLowerCase().includes(term) ||
        inv.internships?.title?.toLowerCase().includes(term) ||
        inv.message?.toLowerCase().includes(term) ||
        inv.status?.toLowerCase().includes(term)
      );
    });

  return (
    <Screen>
      <Header
        back
        title="Invitations"
        subtitle="History of every student you've invited to apply."
        icon={<Send size={22} color={colors.primary} />}
      />

      <View style={{ gap: spacing.md }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search invitations…" />
        <Button
          title="Find students to invite"
          icon={<Users size={16} color={colors.onPrimary} />}
          onPress={() => router.push("/(app)/(tabs)/discover" as never)}
        />
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Segmented
          value={filter}
          onChange={(k) => setFilter(k as Filter)}
          options={[
            { key: "all", label: `All (${counts.all})` },
            { key: "pending", label: `Pending (${counts.pending})` },
            { key: "accepted", label: `Accepted (${counts.accepted})` },
            { key: "declined", label: `Declined (${counts.declined})` },
          ]}
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : !visible.length ? (
        <EmptyState
          icon={<Send size={26} color={colors.textMuted} />}
          title={filter === "all" ? "No invitations sent" : `No ${filter} invitations`}
          description="Go to Discover to invite candidates."
        />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {visible.map((inv) => (
            <Card key={inv.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    variant="h3"
                    numberOfLines={1}
                    onPress={() => router.push(`/(app)/students/${inv.student_id}` as never)}
                  >
                    {inv.profiles?.full_name ?? inv.profiles?.email}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xs }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Briefcase size={12} color={colors.textMuted} />
                      <Text variant="caption" color="textMuted">
                        {inv.internships?.title ?? "—"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text variant="caption" color="textMuted">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {inv.message ? (
                    <Text variant="muted" style={{ marginTop: spacing.sm, fontStyle: "italic" }} numberOfLines={2}>
                      "{inv.message}"
                    </Text>
                  ) : null}
                </View>
                <Badge label={capitalize(inv.status)} variant={statusVariant(inv.status)} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
