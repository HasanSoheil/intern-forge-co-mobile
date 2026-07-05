import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";
import { Screen, Text, Input, Button, Chip, ProgressBar, useToast } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { useFields } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";

export function StudentOnboarding() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: FIELDS = [] } = useFields();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [field, setField] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUsername, setGithubUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["student-onboarding", user?.id],
    queryFn: async () =>
      (await supabase.from("students").select("field,skills,desired_role,github_username,university").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  useEffect(() => {
    if (existing?.field) setField(existing.field);
    if (existing?.skills?.length) setSkills(existing.skills);
    if (existing?.github_username) setGithubUsername(existing.github_username);
    if (existing?.university) setUniversity(existing.university);
  }, [existing]);

  const selectedField = FIELDS.find((f) => f.id === field);
  const toggleSkill = (s: string) => setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = async () => {
    if (!user) return;
    if (!field || skills.length < 3) return toast.error("Pick a field and at least 3 skills");
    setSaving(true);
    const { error } = await supabase
      .from("students")
      .update({
        field,
        desired_role: selectedField?.label ?? field,
        skills,
        github_username: githubUsername || null,
        university: university || null,
        progress_percentage: Math.max(20, skills.length * 5),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    // Update the (app) onboarding-gate cache so it sees a complete profile
    // immediately and doesn't bounce back here on the first Finish.
    qc.setQueryData(["student-gate", user.id], { field, skills });
    toast.success("Profile ready — let's match you up!");
    router.replace("/(app)");
  };

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg }}>
        <Sparkles size={16} color={colors.primary} />
        <Text variant="label" color="primary">STEP {step} OF 3</Text>
      </View>
      <ProgressBar value={(step / 3) * 100} height={6} />

      <Text variant="title" style={{ marginTop: spacing.lg }}>
        {step === 1 ? "What's your field?" : step === 2 ? "Which skills are you sharp on?" : "Last bits."}
      </Text>
      <Text variant="muted" style={{ marginTop: 4 }}>
        {step === 1
          ? "We'll route challenges and matches around this."
          : step === 2
            ? "Pick everything you're confident shipping with (min 3)."
            : "Optional — but companies love seeing your GitHub."}
      </Text>

      <View style={{ marginTop: spacing.xl, flex: 1 }}>
        {step === 1 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {FIELDS.map((f) => {
              const active = field === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setField(f.id);
                    setSkills([]);
                  }}
                  style={{
                    width: "47%",
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.cardBorder,
                    backgroundColor: active ? colors.primary + "18" : colors.card,
                  }}
                >
                  <Text variant="h3">{f.label}</Text>
                  <Text variant="caption" numberOfLines={1} style={{ marginTop: 4 }}>
                    {f.skills.slice(0, 3).join(" · ")}…
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step === 2 && selectedField ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {selectedField.skills.map((s) => (
              <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: spacing.md }}>
            <Input label="GitHub username" value={githubUsername} onChangeText={setGithubUsername} placeholder="octocat" autoCapitalize="none" />
            <Input label="University" value={university} onChangeText={setUniversity} placeholder="MIT" />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))} disabled={step === 1} />
        {step < 3 ? (
          <Button
            title="Continue"
            onPress={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={(step === 1 && !field) || (step === 2 && skills.length < 3)}
            style={{ flex: 1, maxWidth: 200 }}
          />
        ) : (
          <Button title={saving ? "Saving…" : "Finish"} onPress={finish} loading={saving} style={{ flex: 1, maxWidth: 200 }} />
        )}
      </View>
    </Screen>
  );
}
