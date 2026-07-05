import { useEffect, useState } from "react";
import { View, ScrollView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthBackground } from "@/components/AuthBackground";
import { useTheme } from "@/theme/theme";

/**
 * Auth screen shell: the futuristic wallpaper behind a keyboard-aware scroll
 * area. Content is centered when the keyboard is down, and top-aligned with
 * extra scroll room when it's up, so fields are never hidden behind the keyboard.
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height ?? 0));
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthBackground />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: kb > 0 ? "flex-start" : "center",
            padding: spacing.lg,
            paddingBottom: spacing.lg + (Platform.OS === "android" ? kb : 0),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
