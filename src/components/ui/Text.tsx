import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/theme";

type Variant = "display" | "title" | "h2" | "h3" | "body" | "muted" | "label" | "caption";
type ColorKey = "text" | "textMuted" | "textFaint" | "primary" | "accent" | "violet" | "success" | "warning" | "destructive" | "onPrimary";

interface Props extends TextProps {
  variant?: Variant;
  color?: ColorKey;
  weight?: TextStyle["fontWeight"];
  center?: boolean;
}

export function Text({ variant = "body", color, weight, center, style, ...rest }: Props) {
  const { colors, fontSize } = useTheme();

  const variants: Record<Variant, TextStyle> = {
    display: { fontSize: fontSize.display, fontWeight: "800", letterSpacing: -1, color: colors.text },
    title: { fontSize: fontSize.xxl, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    h2: { fontSize: fontSize.xl, fontWeight: "700", letterSpacing: -0.3, color: colors.text },
    h3: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
    body: { fontSize: fontSize.md, fontWeight: "500", color: colors.text },
    muted: { fontSize: fontSize.sm, fontWeight: "500", color: colors.textMuted },
    label: { fontSize: fontSize.sm, fontWeight: "600", letterSpacing: 0.3, color: colors.textMuted },
    caption: { fontSize: fontSize.xs, fontWeight: "600", color: colors.textFaint },
  };

  return (
    <RNText
      style={[
        variants[variant],
        color ? { color: colors[color] } : null,
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: "center" } : null,
        style,
      ]}
      {...rest}
    />
  );
}
