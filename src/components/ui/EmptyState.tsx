import { View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { useTheme } from "@/theme/theme";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {icon ? (
        <View style={{ width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
      ) : null}
      <Text variant="h3" center>{title}</Text>
      {description ? (
        <Text variant="muted" center style={{ maxWidth: 300 }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}
