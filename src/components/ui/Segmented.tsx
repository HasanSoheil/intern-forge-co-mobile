import { Pressable, View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

interface Opt {
  key: string;
  label: string;
}

export function Segmented({ options, value, onChange }: { options: Opt[]; value: string; onChange: (k: string) => void }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.surface2, borderRadius: radius.md, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.sm,
              backgroundColor: active ? colors.card : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: colors.cardBorder,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.text : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
