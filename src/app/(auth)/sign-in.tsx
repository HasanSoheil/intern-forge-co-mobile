import { useState } from "react";
import { View } from "react-native";
import { useRouter, Link } from "expo-router";
import { BlurView } from "expo-blur";
import { Mail, Lock } from "lucide-react-native";
import { Text, Input, Button, useToast } from "@/components/ui";
import { AuthScreen } from "@/components/AuthScreen";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const { colors, spacing, radius, scheme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return toast.error("Enter your email and password");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    router.replace("/(app)");
  };

  return (
    <AuthScreen>
      {/* Brand */}
      <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
        <Logo width={190} />
        <Text variant="title" style={{ marginTop: spacing.sm }}>Welcome back</Text>
        <Text variant="muted" style={{ marginTop: 4 }}>Sign in to continue to CrewLink</Text>
      </View>

      {/* Glass form */}
      <BlurView intensity={scheme === "dark" ? 30 : 60} tint={scheme === "dark" ? "dark" : "light"} style={{ borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}>
        <View style={{ backgroundColor: colors.glass, padding: spacing.lg, gap: spacing.md }}>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" icon={<Mail size={18} color={colors.textFaint} />} />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry icon={<Lock size={18} color={colors.textFaint} />} />
          <Button title="Sign in" onPress={submit} loading={loading} size="lg" fullWidth style={{ marginTop: spacing.sm }} />
        </View>
      </BlurView>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: spacing.xl }}>
        <Text variant="muted">New here?</Text>
        <Link href="/(auth)/sign-up" replace>
          <Text color="primary" weight="700">Create an account</Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
