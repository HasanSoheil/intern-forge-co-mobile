import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { BlurView } from "expo-blur";
import { GraduationCap, Building2, Mail, Lock, User } from "lucide-react-native";
import { Text, Input, Button, useToast } from "@/components/ui";
import { AuthScreen } from "@/components/AuthScreen";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";

type Role = "student" | "company";

export default function SignUp() {
  const { colors, spacing, radius, scheme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fullName || !email || !password) return toast.error("Fill in all fields");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName, role, company_name: role === "company" ? fullName : null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // Email confirmation is required, so no session is returned yet — the user
    // must enter the 6-digit code we just emailed them. (If confirmation is
    // ever disabled again, a session comes back and we skip straight in.)
    if (data.session) {
      toast.success("Account created!");
      return router.replace("/(app)");
    }
    toast.success("Account created — check your email!");
    router.push({ pathname: "/(auth)/verify-email", params: { email: email.trim() } });
  };

  const RoleCard = ({ value, icon, title, sub }: { value: Role; icon: React.ReactNode; title: string; sub: string }) => {
    const active = role === value;
    return (
      <Pressable
        onPress={() => setRole(value)}
        style={{
          flex: 1,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: active ? colors.primary : colors.cardBorder,
          backgroundColor: active ? colors.primary + "22" : colors.inputBg,
          gap: 6,
        }}
      >
        {icon}
        <Text variant="h3" style={{ fontSize: 15 }}>{title}</Text>
        <Text variant="caption">{sub}</Text>
      </Pressable>
    );
  };

  return (
    <AuthScreen>
      <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
        <Logo width={170} />
        <Text variant="title" style={{ marginTop: spacing.sm }}>Create your account</Text>
        <Text variant="muted" style={{ marginTop: 4 }}>Free for students · join CrewLink</Text>
      </View>

      <BlurView intensity={scheme === "dark" ? 30 : 60} tint={scheme === "dark" ? "dark" : "light"} style={{ borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}>
        <View style={{ backgroundColor: colors.glass, padding: spacing.lg, gap: spacing.md }}>
          <View>
            <Text variant="label" style={{ marginBottom: 8 }}>I AM A</Text>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <RoleCard value="student" icon={<GraduationCap size={22} color={colors.primary} />} title="Student" sub="Find internships" />
              <RoleCard value="company" icon={<Building2 size={22} color={colors.accent} />} title="Company" sub="Hire interns" />
            </View>
          </View>

          <Input label={role === "company" ? "Company name" : "Full name"} value={fullName} onChangeText={setFullName} placeholder={role === "company" ? "Acme Inc." : "Ada Lovelace"} icon={<User size={18} color={colors.textFaint} />} />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" icon={<Mail size={18} color={colors.textFaint} />} />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry icon={<Lock size={18} color={colors.textFaint} />} />
          <Button title="Create account" onPress={submit} loading={loading} size="lg" fullWidth style={{ marginTop: spacing.sm }} />
        </View>
      </BlurView>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: spacing.lg }}>
        <Text variant="muted">Already have an account?</Text>
        <Link href="/(auth)/sign-in" replace>
          <Text color="primary" weight="700">Sign in</Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
