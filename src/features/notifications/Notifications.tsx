import { View } from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Bell, Briefcase, Trophy, Send, Eye, Mail, Sparkles } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen, Header, Card, Text, Button, SearchBar, EmptyState, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  internship_id: string | null;
  student_id: string | null;
  read: boolean;
  created_at: string;
};

function iconFor(type: string): LucideIcon {
  if (type === "application_accepted") return Trophy;
  if (type === "application_rejected") return Briefcase;
  if (type === "invitation_received") return Mail;
  if (type === "internship_match") return Sparkles;
  if (type === "profile_view") return Eye;
  if (type === "application_received") return Send;
  return Bell;
}

export function Notifications() {
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,message,internship_id,student_id,read,created_at")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as unknown as NotificationRow[];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("recipient_id", user!.id).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = items?.filter((n) => !n.read).length ?? 0;

  const query = q.trim().toLowerCase();
  const filtered = query
    ? items?.filter((n) => `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase().includes(query))
    : items;

  const handlePress = (n: NotificationRow) => {
    if (!n.read) markRead.mutate(n.id);
    switch (n.type) {
      case "application_accepted":
      case "application_rejected":
        router.push("/(app)/applications" as never);
        break;
      case "internship_match":
        router.push("/(app)" as never);
        break;
      case "invitation_received":
        router.push("/(app)/invitations" as never);
        break;
      case "application_received":
        router.push("/(app)/(tabs)/browse" as never);
        break;
      case "profile_view":
        router.push("/(app)/profile" as never);
        break;
      default:
        break;
    }
  };

  return (
    <Screen>
      <Header
        back
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        icon={<Bell size={22} color={colors.primary} />}
        right={
          unreadCount > 0 ? (
            <Button title="Mark all as read" size="sm" variant="outline" onPress={() => markAllRead.mutate()} />
          ) : undefined
        }
      />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search notifications…" />

      {isLoading ? (
        <Loading />
      ) : !items?.length ? (
        <EmptyState
          icon={<Bell size={26} color={colors.textMuted} />}
          title="No notifications yet"
          description="You'll be notified when students apply or submit challenges."
        />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {filtered?.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <Card key={n.id} padded highlight={!n.read} onPress={() => handlePress(n)}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: n.read ? colors.surface2 : colors.primary + "1A",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} color={n.read ? colors.textMuted : colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={2}>
                      {n.title}
                    </Text>
                    {n.message ? (
                      <Text variant="muted" style={{ marginTop: 2 }} numberOfLines={3}>
                        {n.message}
                      </Text>
                    ) : null}
                    <Text variant="caption" color="textFaint" style={{ marginTop: spacing.xs }}>
                      {timeAgo(n.created_at)}
                    </Text>
                  </View>
                  {!n.read ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} />
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
