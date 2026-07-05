import { useEffect, useRef } from "react";
import { Animated, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop, Line, G } from "react-native-svg";
import { useTheme } from "@/theme/theme";

/**
 * Futuristic auth wallpaper: deep space-navy base with glowing emerald + violet
 * orbs, a faint tech grid, and a slow drifting shimmer. Pure SVG/gradients so it
 * works offline and stays crisp at any size. Render behind your content.
 */
export function AuthBackground() {
  const { colors, scheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ]),
    ).start();
  }, [drift, pulse]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const gridColor = scheme === "dark" ? "#2A3852" : "#C9D4E5";
  const gridOpacity = scheme === "dark" ? 0.18 : 0.5;
  const step = 46;
  const vLines = Math.ceil(width / step) + 1;
  const hLines = Math.ceil(height / step) + 1;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background }}>
      {/* base + grid */}
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.background} />
        <G opacity={gridOpacity}>
          {Array.from({ length: vLines }).map((_, i) => (
            <Line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={height} stroke={gridColor} strokeWidth={0.5} />
          ))}
          {Array.from({ length: hLines }).map((_, i) => (
            <Line key={`h${i}`} x1={0} y1={i * step} x2={width} y2={i * step} stroke={gridColor} strokeWidth={0.5} />
          ))}
        </G>
      </Svg>

      {/* drifting glow orbs */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: glowOpacity,
          transform: [{ translateX }, { translateY }],
        }}
      >
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="emerald" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={scheme === "dark" ? 0.55 : 0.35} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="violet" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.violet} stopOpacity={scheme === "dark" ? 0.5 : 0.3} />
              <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="cyan" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={scheme === "dark" ? 0.4 : 0.22} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={width * 0.82} cy={height * 0.12} r={width * 0.62} fill="url(#emerald)" />
          <Circle cx={width * 0.1} cy={height * 0.85} r={width * 0.7} fill="url(#violet)" />
          <Circle cx={width * 0.95} cy={height * 0.7} r={width * 0.45} fill="url(#cyan)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
