import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { useTheme } from "@/theme/theme";

export function SearchBar({ value, onChangeText, placeholder = "Search…" }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.inputBg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        height: 48,
      }}
    >
      <Search size={18} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={{ flex: 1, color: colors.text, fontSize: 15 }}
      />
    </View>
  );
}
