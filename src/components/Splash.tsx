import { useEffect, useRef } from "react";
import { Animated, View, Easing } from "react-native";
import { Text } from "@/components/ui";
import { AuthBackground } from "@/components/AuthBackground";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/theme/theme";

/**
 * Branded animated splash — logo mark scales/fades in over the futuristic
 * wallpaper, with a soft pulsing ring. Purely visual; navigation is handled by
 * the caller.
 */
export function Splash() {
  const { spacing } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fade, scale, textFade]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <AuthBackground />

      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: "center" }}>
        <Logo width={240} />
      </Animated.View>

      <Animated.View style={{ opacity: textFade, alignItems: "center", marginTop: spacing.sm }}>
        <Text variant="muted" style={{ letterSpacing: 0.5 }}>
          Skill-matched · GitHub-validated
        </Text>
      </Animated.View>
    </View>
  );
}
