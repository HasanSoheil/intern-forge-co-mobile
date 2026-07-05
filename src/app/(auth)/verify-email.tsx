import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { BlurView } from "expo-blur";
import { MailCheck } from "lucide-react-native";
import { Text, Button, useToast } from "@/components/ui";
import { AuthScreen } from "@/components/AuthScreen";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds; Supabase rate-limits resends server-side

export default function VerifyEmail() {
  const { colors, spacing, radius, scheme } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);

  // Tick the resend cooldown down once per second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const verify = async (token: string) => {
    if (!email) return toast.error("Missing email — go back and sign up again");
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    setVerifying(false);
    if (error) {
      setCode("");
      inputRef.current?.focus();
      return toast.error(
        error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
          ? "Wrong or expired code — try again"
          : error.message,
      );
    }
    toast.success("Email verified — welcome to CrewLink!");
    router.replace("/(app)");
  };

  const onChangeCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !verifying) verify(digits);
  };

  const resend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) return toast.error(error.message);
    setCooldown(RESEND_COOLDOWN);
    toast.success("A new code is on its way");
  };

  const cells = Array.from({ length: CODE_LENGTH });

  return (
    <AuthScreen>
      <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
        <Logo width={170} />
        <Text variant="title" style={{ marginTop: spacing.sm }}>Verify your email</Text>
        <Text variant="muted" center style={{ marginTop: 4 }}>
          We sent a 6-digit code to{"\n"}
          <Text weight="700" color="text">{email ?? "your email"}</Text>
        </Text>
      </View>

      <BlurView
        intensity={scheme === "dark" ? 30 : 60}
        tint={scheme === "dark" ? "dark" : "light"}
        style={{ borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View style={{ backgroundColor: colors.glass, padding: spacing.lg, gap: spacing.lg, alignItems: "center" }}>
          <MailCheck size={36} color={colors.primary} />

          {/* Six code cells over one hidden input, so the native keyboard and
              paste both work while we keep full visual control. */}
          <Pressable onPress={() => inputRef.current?.focus()} style={{ width: "100%" }}>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
              {cells.map((_, i) => {
                const filled = i < code.length;
                const active = i === code.length;
                return (
                  <View
                    key={i}
                    style={{
                      width: 46,
                      height: 56,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : filled ? colors.primary + "88" : colors.cardBorder,
                      backgroundColor: colors.inputBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text variant="h2" style={{ fontSize: 24 }}>{code[i] ?? ""}</Text>
                  </View>
                );
              })}
            </View>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChangeCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={CODE_LENGTH}
              autoFocus
              caretHidden
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011 }}
            />
          </Pressable>

          <Button
            title="Verify"
            onPress={() => verify(code)}
            loading={verifying}
            disabled={code.length < CODE_LENGTH}
            size="lg"
            fullWidth
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text variant="muted">Didn't get it?</Text>
            {cooldown > 0 ? (
              <Text variant="muted">Resend in {cooldown}s</Text>
            ) : (
              <Pressable onPress={resend} disabled={resending}>
                <Text color="primary" weight="700">{resending ? "Sending..." : "Resend code"}</Text>
              </Pressable>
            )}
          </View>

          <Text variant="caption" center>
            If your email shows a confirmation link instead of a code, tap the link, then sign in below.
          </Text>
        </View>
      </BlurView>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: spacing.lg }}>
        <Text variant="muted">Wrong email?</Text>
        <Link href="/(auth)/sign-up" replace>
          <Text color="primary" weight="700">Sign up again</Text>
        </Link>
        <Text variant="muted">·</Text>
        <Link href="/(auth)/sign-in" replace>
          <Text color="primary" weight="700">Sign in</Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
