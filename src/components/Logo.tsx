import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

// The CrewLink logo — transparent, vertically stacked (compass mark over the
// "CrewLink" wordmark), original navy/green colors. Rendered bare (no backing).
const logoSrc = require("../../assets/images/logo.png");
const ASPECT = 1.05; // width / height of logo.png

export function Logo({ width = 200, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={logoSrc} style={[{ width, height: width / ASPECT }, style]} contentFit="contain" />;
}
