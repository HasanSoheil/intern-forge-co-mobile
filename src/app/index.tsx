import { useEffect, useState } from "react";
import { useRouter, useRootNavigationState } from "expo-router";
import { Splash } from "@/components/Splash";
import { useAuth } from "@/context/auth-context";

/**
 * Entry screen: shows the branded splash for a minimum beat, then routes to the
 * app (if signed in) or the sign-in screen.
 */
export default function Entry() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (minElapsed && !loading && navState?.key) {
      router.replace(session ? "/(app)" : "/(auth)/sign-in");
    }
  }, [minElapsed, loading, session, router, navState?.key]);

  return <Splash />;
}
