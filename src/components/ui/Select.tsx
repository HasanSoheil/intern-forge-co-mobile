import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export function Select({ label, value, options, placeholder = "Select…", onChange }: Props) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label ? (
        <Text variant="label" style={{ marginBottom: 6, color: colors.textMuted }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.inputBg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          height: 50,
        }}
      >
        <Text style={{ color: selected ? colors.text : colors.textFaint, fontSize: 15 }}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.backgroundElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: 32, maxHeight: "70%", borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            {label ? <Text variant="h3" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>{label}</Text> : null}
            <ScrollView>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                    }}
                  >
                    <Text style={{ color: active ? colors.primary : colors.text, fontWeight: active ? "700" : "500", fontSize: 15 }}>
                      {o.label}
                    </Text>
                    {active ? <Check size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
