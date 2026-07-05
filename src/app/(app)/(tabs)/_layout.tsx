import { View, Pressable } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home, LayoutDashboard, Briefcase, Users, Sparkles, Target, MessageSquare, LayoutGrid,
  Tags, CreditCard, Settings,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth, type AppRole } from "@/context/auth-context";

type TabMeta = { label: string; icon: LucideIcon };
const TAB_CONFIG: Record<string, Partial<Record<AppRole, TabMeta>>> = {
  index: {
    student: { label: "Home", icon: Home },
    company: { label: "Dashboard", icon: LayoutDashboard },
    admin: { label: "Overview", icon: LayoutDashboard },
  },
  browse: {
    student: { label: "Internships", icon: Briefcase },
    company: { label: "Applicants", icon: Users },
    admin: { label: "Users", icon: Users },
  },
  discover: {
    student: { label: "Challenges", icon: Sparkles },
    company: { label: "Matched", icon: Target },
    admin: { label: "Fields", icon: Tags },
  },
  messages: {
    student: { label: "Messages", icon: MessageSquare },
    company: { label: "Messages", icon: MessageSquare },
    admin: { label: "Plans", icon: CreditCard },
  },
  admin: {
    admin: { label: "Challenges", icon: Sparkles },
  },
  more: {
    student: { label: "More", icon: LayoutGrid },
    company: { label: "More", icon: LayoutGrid },
    admin: { label: "Settings", icon: Settings },
  },
};

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  // navigation typed loosely to avoid expo-router vs @react-navigation type drift.
  navigation: any;
}

function CustomTabBar({ state, navigation }: TabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const r = role ?? "student";

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <BlurView intensity={40} tint={scheme === "dark" ? "dark" : "light"} style={{ borderTopWidth: 1, borderColor: colors.cardBorder }}>
        <View
          style={{
            flexDirection: "row",
            paddingTop: 10,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            paddingHorizontal: 8,
            backgroundColor: colors.tabBar,
          }}
        >
          {state.routes.map((route, index) => {
            const meta = TAB_CONFIG[route.name]?.[r];
            if (!meta) return null; // hide tabs not relevant to this role
            const focused = state.index === index;
            const Icon = meta.icon;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return (
              <Pressable key={route.key} onPress={onPress} style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <Icon size={22} color={focused ? colors.primary : colors.tabInactive} strokeWidth={focused ? 2.5 : 2} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: focused ? colors.primary : colors.tabInactive }}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="browse" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="admin" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
