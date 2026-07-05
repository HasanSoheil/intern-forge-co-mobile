import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";
import { matchTier } from "@/lib/matching";

function tierGradient(key: string, colors: ReturnType<typeof useTheme>["colors"]): [string, string] {
  if (key === "excellent") return colors.gradLime;
  if (key === "strong") return colors.gradEmerald;
  if (key === "decent") return colors.gradCyan;
  return [colors.textFaint, colors.textMuted];
}

export function MatchRing({ score, size = 64, stroke = 6, showLabel = false }: { score: number; size?: number; stroke?: number; showLabel?: boolean }) {
  const { colors } = useTheme();
  const tier = matchTier(score);
  const grad = tierGradient(tier.key, colors);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const id = `mr-${tier.key}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={grad[0]} />
            <Stop offset="1" stopColor={grad[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: size * 0.28, fontWeight: "800", color: colors.text }}>{Math.round(score)}</Text>
        {showLabel ? <Text style={{ fontSize: 9, fontWeight: "700", color: colors.textMuted }}>MATCH</Text> : null}
      </View>
    </View>
  );
}

export function MatchBadge({ score }: { score: number }) {
  const { colors, radius } = useTheme();
  const tier = matchTier(score);
  const grad = tierGradient(tier.key, colors);
  return (
    <View style={{ borderRadius: radius.pill, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: grad[0] + "22", borderWidth: 1, borderColor: grad[0] + "55", borderRadius: radius.pill }}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: grad[0] }}>{Math.round(score)}%</Text>
        <Text style={{ fontSize: 10, fontWeight: "600", color: colors.textMuted }}>match</Text>
      </View>
    </View>
  );
}
