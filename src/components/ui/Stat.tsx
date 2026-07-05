import { View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

export function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {icon}
        <Text variant="caption" numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{value}</Text>
    </View>
  );
}
