import { View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "destructive" | "accent" | "violet" | "muted";

function hexAlpha(hex: string, alpha: number) {
  // hex like #RRGGBB -> rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Badge({ label, variant = "default", icon }: { label: string; variant?: BadgeVariant; icon?: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();

  const map: Record<BadgeVariant, string> = {
    default: colors.textMuted,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    destructive: colors.destructive,
    accent: colors.accent,
    violet: colors.violet,
    muted: colors.textFaint,
  };
  const c = map[variant];
  const wrap: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: variant === "muted" ? colors.surface2 : hexAlpha(c.startsWith("#") ? c : colors.primary, 0.16),
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: hexAlpha(c.startsWith("#") ? c : colors.primary, 0.3),
  };
  return (
    <View style={wrap}>
      {icon}
      <Text style={{ fontSize: 11, fontWeight: "700", color: variant === "muted" ? colors.textMuted : c }}>{label}</Text>
    </View>
  );
}
