import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/theme/theme";

export function Loading({ size = "large" }: { size?: "small" | "large" }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}
