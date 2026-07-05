import { View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  FileText, Mail, Bell, Settings as SettingsIcon, Send, Users, PlusCircle,
  ChevronRight, LogOut, Shield,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen, Header, Card, Text, Avatar, useToast } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";

interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
}

const STUDENT: Item[] = [
  { label: "My applications", icon: FileText, href: "/(app)/applications" },
  { label: "Invitations", icon: Mail, href: "/(app)/invitations" },
  { label: "Notifications", icon: Bell, href: "/(app)/notifications" },
  { label: "Settings", icon: SettingsIcon, href: "/(app)/settings" },
];

const COMPANY: Item[] = [
  { label: "Post an internship", icon: PlusCircle, href: "/(app)/post" },
  { label: "Interns", icon: Users, href: "/(app)/interns" },
  { label: "Sent invitations", icon: Send, href: "/(app)/sent-invitations" },
  { label: "Notifications", icon: Bell, href: "/(app)/notifications" },
  { label: "Settings", icon: SettingsIcon, href: "/(app)/settings" },
];


export function MoreMenu() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, role, signOut } = useAuth();
  // Admins never see this screen — their last tab renders Settings directly.
  const items = role === "company" ? COMPANY : STUDENT;

  return (
    <Screen>
      <Header title="More" />

      <Card padded onPress={() => router.push("/(app)/profile")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Avatar name={user?.user_metadata?.full_name} email={user?.email} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1}>{user?.user_metadata?.full_name ?? user?.email}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              {role === "admin" ? <Shield size={13} color={colors.primary} /> : null}
              <Text variant="muted" style={{ textTransform: "capitalize" }}>{role}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textFaint} />
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Pressable
              key={it.href + it.label}
              onPress={() => router.push(it.href as never)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 14,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                <Icon size={19} color={colors.primary} />
              </View>
              <Text variant="body" weight="600" style={{ flex: 1 }}>{it.label}</Text>
              <ChevronRight size={18} color={colors.textFaint} />
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => {
            Alert.alert("Log out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Log out",
                style: "destructive",
                onPress: async () => {
                  await signOut();
                  toast.success("Signed out");
                  router.replace("/(auth)/sign-in");
                },
              },
            ]);
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.destructive + "44",
            borderRadius: 14,
            padding: spacing.md,
            marginTop: spacing.sm,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.destructive + "1A", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={19} color={colors.destructive} />
          </View>
          <Text variant="body" weight="600" color="destructive">Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
