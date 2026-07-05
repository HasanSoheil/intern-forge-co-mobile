import { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider, useTheme } from "@/theme/theme";
import { ToastProvider } from "@/components/ui";

// Keep the native splash up until React has mounted, then hand off to the
// in-app animated splash (src/app/index.tsx) for a seamless transition.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Gate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();
  const { colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Wait until the root navigator is mounted before navigating, otherwise
    // React warns about updating a component that hasn't mounted yet.
    if (loading || !navState?.key) return;
    const group = segments[0] as string | undefined;
    const inAuth = group === "(auth)";
    const inApp = group === "(app)";
    const inOnboarding = group === "onboarding";

    if (!session) {
      // Protect the app; the entry splash (index) sends new users to sign-in.
      if (inApp || inOnboarding) router.replace("/(auth)/sign-in");
    } else {
      // Signed-in users should never sit on the auth screens.
      if (inAuth) router.replace("/(app)");
    }
  }, [session, loading, segments, router, navState?.key]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Gate />
              </ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
