import { Pressable } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.surface2,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.onPrimary : colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}
