import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";
import type { TextStyle } from "react-native";

/**
 * Gradient-filled text. Falls back to a flat primary color if MaskedView isn't
 * available (so the build never breaks on it).
 */
export function GradientText({ children, style, colors: grad }: { children: string; style?: TextStyle; colors?: [string, string] }) {
  const { colors } = useTheme();
  const g = grad ?? colors.gradHero;
  try {
    return (
      <MaskedView maskElement={<Text style={[style, { backgroundColor: "transparent" }]}>{children}</Text>}>
        <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    );
  } catch {
    return <Text style={[style, { color: g[0] }]}>{children}</Text>;
  }
}
