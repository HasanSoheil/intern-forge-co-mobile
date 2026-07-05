import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";

/** Top-bar bell that shows the unread count and opens the notifications screen. */
export function NotificationBell() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 20000,
  });

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications")}
      hitSlop={10}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Bell size={20} color={colors.text} />
      {unread > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: colors.destructive,
            borderWidth: 2,
            borderColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onDestructive }}>
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
