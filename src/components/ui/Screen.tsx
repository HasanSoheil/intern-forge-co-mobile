import { useEffect, useState } from "react";
import { ScrollView, View, type ViewStyle, RefreshControl, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, padded = true, edges = ["top"], refreshing, onRefresh, contentStyle }: Props) {
  const { colors, spacing } = useTheme();
  const pad: ViewStyle = padded ? { paddingHorizontal: spacing.lg } : {};

  // Track the keyboard height so the scroll content always has room to lift a
  // focused input (e.g. the GitHub URL field) above the on-screen keyboard.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // On Android the window resizes, so we add the keyboard height as extra scroll
  // room. On iOS `automaticallyAdjustKeyboardInsets` handles the inset + scroll.
  const bottomPad = 120 + (Platform.OS === "android" ? kbHeight : 0);

  if (!scroll) {
    return (
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[{ paddingBottom: bottomPad }, pad, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
