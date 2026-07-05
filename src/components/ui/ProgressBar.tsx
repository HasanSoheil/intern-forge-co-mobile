import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/theme";

export function ProgressBar({ value, height = 8, colors: grad }: { value: number; height?: number; colors?: [string, string] }) {
  const { colors, radius } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height, backgroundColor: colors.surface2, borderRadius: radius.pill, overflow: "hidden" }}>
      <LinearGradient
        colors={grad ?? colors.gradHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${pct}%`, height: "100%", borderRadius: radius.pill }}
      />
    </View>
  );
}
