import { View, type ViewProps, type ViewStyle, Pressable } from "react-native";
import { useTheme } from "@/theme/theme";

interface Props extends ViewProps {
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  highlight?: boolean;
}

export function Card({ padded = true, style, children, onPress, highlight, ...rest }: Props) {
  const { colors, radius, spacing } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: highlight ? colors.primary : colors.cardBorder,
    padding: padded ? spacing.lg : 0,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null, style as ViewStyle]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style as ViewStyle]} {...rest}>
      {children}
    </View>
  );
}
