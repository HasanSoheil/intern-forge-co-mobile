import {
  Button,
  Card,
  Chip,
  Header,
  Input,
  Screen,
  Text,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import { useFields } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme/theme";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Switch, View } from "react-native";

export function PostInternship() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data: FIELDS = [] } = useFields();

  const [form, setForm] = useState({
    title: "",
    role: "",
    field: "frontend",
    description: "",
    location: "",
    remote: false,
    duration_months: 3,
    stipend: 0,
    application_deadline: "",
    challenge_title: "",
    challenge_instructions: "",
    challenge_files: "README.md, package.json",
    challenge_keywords: "",
  });
  const [skills, setSkills] = useState<string[]>([]);

  const selectedField = useMemo(
    () => FIELDS.find((f) => f.id === form.field),
    [form.field, FIELDS],
  );
  const skillOptions = selectedField?.skills ?? [];

  const toggleSkill = (s: string) =>
    setSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const { data: sub } = useQuery({
    queryKey: ["my-sub", user?.id],
    queryFn: async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("company_id", user!.id)
          .eq("status", "active")
          .maybeSingle()
      ).data,
    enabled: !!user,
  });

  const post = useMutation({
    mutationFn: async () => {
      if (!sub) throw new Error("You need an active plan to post internships.");
      if (!form.title.trim()) throw new Error("Add a title.");
      if (!form.description.trim()) throw new Error("Add a description.");
      if (skills.length === 0)
        throw new Error("Pick at least one required skill.");
      const { data: ins, error } = await supabase
        .from("internships")
        .insert({
          company_id: user!.id,
          title: form.title,
          role: form.role || (selectedField?.label ?? form.field),
          description: form.description,
          required_skills: skills,
          location: form.location,
          remote: form.remote,
          duration_months: form.duration_months,
          stipend: form.stipend,
          application_deadline: form.application_deadline
            ? new Date(form.application_deadline).toISOString()
            : null,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      if (form.challenge_title) {
        await supabase.from("internship_challenges").insert({
          internship_id: ins.id,
          title: form.challenge_title,
          description: "",
          instructions: form.challenge_instructions || null,
          required_files: form.challenge_files
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          required_keywords: form.challenge_keywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }
      return ins;
    },
    onSuccess: (ins) => {
      toast.success("Internship posted!");
      router.replace(`/(app)/internships/${ins.id}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Screen>
      <Header
        back
        title="Post a new internship"
        subtitle="Pick the field, choose required skills, and add a coding challenge to rank applicants."
      />

      {!sub ? (
        <Card
          padded
          style={{
            borderColor: colors.destructive + "55",
            backgroundColor: colors.destructive + "1A",
            marginBottom: spacing.lg,
          }}>
          <Text variant="body" weight="600">
            You need an active subscription.
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Choose a plan"
              variant="secondary"
              size="sm"
              onPress={() => router.push("/(app)/profile")}
            />
          </View>
        </Card>
      ) : null}

      <View style={{ gap: spacing.lg }}>
        <Input
          label="Title"
          value={form.title}
          onChangeText={(t) => setForm({ ...form, title: t })}
          placeholder="Frontend Engineer Intern"
        />

        <View>
          <Text
            variant="label"
            style={{ marginBottom: spacing.sm, color: colors.textMuted }}>
            Field
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FIELDS.map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                active={form.field === f.id}
                onPress={() => {
                  setForm({ ...form, field: f.id });
                  setSkills([]);
                }}
              />
            ))}
          </View>
          <Text variant="caption" style={{ marginTop: 6 }}>
            Drives which skills appear below
          </Text>
        </View>

        <Input
          label="Role title"
          value={form.role}
          onChangeText={(t) => setForm({ ...form, role: t })}
          placeholder={selectedField?.label ?? "e.g. Frontend Developer"}
          hint="Shown to students, e.g. Frontend Developer"
        />

        <Input
          label="Description"
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          multiline
          placeholder="What will the intern work on?"
        />

        <View>
          <Text
            variant="label"
            style={{ marginBottom: spacing.sm, color: colors.textMuted }}>
            Required skills
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {skillOptions.map((s) => (
              <Chip
                key={s}
                label={s}
                active={skills.includes(s)}
                onPress={() => toggleSkill(s)}
              />
            ))}
          </View>
          <Text variant="caption" style={{ marginTop: 6 }}>
            Pick from {selectedField?.label ?? "the"} stack — {skills.length}{" "}
            selected
          </Text>
        </View>

        <Input
          label="Location"
          value={form.location}
          onChangeText={(t) => setForm({ ...form, location: t })}
          placeholder="Remote / City"
        />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Input
            label="Duration (mo)"
            value={String(form.duration_months)}
            onChangeText={(t) =>
              setForm({
                ...form,
                duration_months: Number(t.replace(/[^0-9]/g, "")) || 0,
              })
            }
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Stipend ($)"
            value={String(form.stipend)}
            onChangeText={(t) =>
              setForm({
                ...form,
                stipend: Number(t.replace(/[^0-9]/g, "")) || 0,
              })
            }
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Input
          label="Application deadline (optional)"
          value={form.application_deadline}
          onChangeText={(t) => setForm({ ...form, application_deadline: t })}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          hint="Applications close automatically after this date."
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}>
          <Switch
            value={form.remote}
            onValueChange={(v) => setForm({ ...form, remote: v })}
            trackColor={{ false: colors.surface2, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
          <Text variant="body" weight="600">
            Remote
          </Text>
        </View>

        <Card padded style={{ gap: spacing.md }}>
          <View>
            <Text variant="h3">Coding challenge</Text>
            <Text variant="caption" style={{ marginTop: 4 }}>
              Optional but recommended — students submit a GitHub repo we'll
              auto-score to rank applicants.
            </Text>
          </View>
          <Input
            label="Challenge title"
            value={form.challenge_title}
            onChangeText={(t) => setForm({ ...form, challenge_title: t })}
            placeholder="Build a Todo app with React"
          />
          <Input
            label="Detailed instructions"
            value={form.challenge_instructions}
            onChangeText={(t) =>
              setForm({ ...form, challenge_instructions: t })
            }
            multiline
            placeholder={
              "e.g. Build a Todo app with:\n- Add/edit/delete tasks\n- React + TypeScript"
            }
            hint="The full task spec. The AI grades submissions against this — be specific."
          />
          <Input
            label="Required files (comma-separated)"
            value={form.challenge_files}
            onChangeText={(t) => setForm({ ...form, challenge_files: t })}
            autoCapitalize="none"
          />
          <Input
            label="Required keywords (comma-separated)"
            value={form.challenge_keywords}
            onChangeText={(t) => setForm({ ...form, challenge_keywords: t })}
            placeholder="react, useState, fetch"
            autoCapitalize="none"
          />
        </Card>

        <Button
          title="Publish internship"
          fullWidth
          loading={post.isPending}
          disabled={post.isPending || !sub}
          onPress={() => post.mutate()}
          style={{ borderRadius: radius.md }}
        />
      </View>
    </Screen>
  );
}
