import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Header({ title, subtitle, back, right, icon }: Props) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg }}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)"))}
          hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
