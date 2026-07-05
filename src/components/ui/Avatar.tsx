import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";
import { initials } from "@/lib/utils";

interface Props {
  name?: string | null;
  email?: string | null;
  size?: number;
  gradient?: [string, string];
}

export function Avatar({ name, email, size = 48, gradient }: Props) {
  const { colors } = useTheme();
  const g = gradient ?? colors.gradHero;
  return (
    <LinearGradient
      colors={g}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "800", color: colors.onPrimary }}>
        {initials(name, email)}
      </Text>
    </LinearGradient>
  );
}

export function CompanyMark({ name, size = 48 }: { name?: string | null; size?: number }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: "800", color: colors.primary }}>
        {initials(name)}
      </Text>
    </View>
  );
}
