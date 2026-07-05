import { useEffect } from "react";
import { Stack, useRouter, useRootNavigationState } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";

export default function AppLayout() {
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Student onboarding gate (mirrors the web /app gate).
  const { data: student } = useQuery({
    queryKey: ["student-gate", user?.id],
    queryFn: async () => (await supabase.from("students").select("field,skills").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user && role === "student",
  });

  // Company onboarding gate — no active plan means setup isn't finished yet.
  const { data: companySub, isFetched: subFetched } = useQuery({
    queryKey: ["company-sub-gate", user?.id],
    queryFn: async () =>
      (await supabase.from("subscriptions").select("id").eq("company_id", user!.id).eq("status", "active").maybeSingle()).data,
    enabled: !!user && role === "company",
  });

  useEffect(() => {
    if (!navState?.key) return;
    if (role === "student" && student) {
      const incomplete = !student.field || !(student.skills?.length ?? 0);
      if (incomplete) router.replace("/onboarding");
    }
    if (role === "company" && subFetched && !companySub) {
      router.replace("/onboarding");
    }
  }, [role, student, companySub, subFetched, router, navState?.key]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="internships/[id]" />
      <Stack.Screen name="challenges/[id]" />
      <Stack.Screen name="applications" />
      <Stack.Screen name="invitations" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="messages/[threadId]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="post" />
      <Stack.Screen name="sent-invitations" />
      <Stack.Screen name="interns" />
      <Stack.Screen name="students/[id]" />
    </Stack>
  );
}
