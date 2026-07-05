import { useState } from "react";
import { TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  multiline?: boolean;
}

export function Input({ label, hint, icon, containerStyle, multiline, style, ...rest }: Props) {
  const { colors, radius, spacing, fontSize } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" style={{ marginBottom: 6, color: colors.textMuted }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          backgroundColor: colors.inputBg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.md : 0,
          minHeight: multiline ? 110 : 50,
        }}
      >
        {icon ? <View style={{ paddingTop: multiline ? 2 : 0 }}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          style={[
            {
              flex: 1,
              color: colors.text,
              fontSize: fontSize.md,
              paddingVertical: multiline ? 0 : 14,
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
          {...rest}
        />
      </View>
      {hint ? (
        <Text variant="caption" style={{ marginTop: 4 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
