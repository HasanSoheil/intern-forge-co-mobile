import { ActivityIndicator, Pressable, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = "primary", size = "md", loading, disabled, icon, fullWidth, style,
}: Props) {
  const { colors, radius } = useTheme();
  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
  const fontSizes: Record<Size, number> = { sm: 13, md: 15, lg: 16 };
  const isDisabled = disabled || loading;

  const inner = (textColor: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {loading ? <ActivityIndicator size="small" color={textColor} /> : icon}
      <Text style={{ fontSize: fontSizes[size], fontWeight: "700", color: textColor }}>{title}</Text>
    </View>
  );

  const base: ViewStyle = {
    height: heights[size],
    borderRadius: radius.md,
    paddingHorizontal: size === "sm" ? 14 : 20,
    alignItems: "center",
    justifyContent: "center",
    width: fullWidth ? "100%" : undefined,
    opacity: isDisabled ? 0.55 : 1,
  };

  if (variant === "primary") {
    return (
      <Pressable onPress={isDisabled ? undefined : onPress} style={({ pressed }) => [{ width: fullWidth ? "100%" : undefined, opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1 }, style]}>
        <LinearGradient colors={colors.gradHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[base, { opacity: 1 }]}>
          {inner(colors.onPrimary)}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyles: Record<Exclude<Variant, "primary">, { bg: string; border: string; text: string }> = {
    secondary: { bg: colors.surface2, border: colors.cardBorder, text: colors.text },
    outline: { bg: "transparent", border: colors.border, text: colors.text },
    ghost: { bg: "transparent", border: "transparent", text: colors.primary },
    destructive: { bg: colors.destructive, border: colors.destructive, text: colors.onDestructive },
  };
  const v = variantStyles[variant];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [base, { backgroundColor: v.bg, borderWidth: 1, borderColor: v.border, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 }, style]}
    >
      {inner(v.text)}
    </Pressable>
  );
}
