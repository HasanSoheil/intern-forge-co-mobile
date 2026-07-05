import { useState } from "react";
import { View, Switch, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Settings as SettingsIcon, Moon, Bell, Lock, Mail, Trash2, AlertTriangle, LogOut } from "lucide-react-native";
import { Screen, Header, Card, Text, Button, Input, Segmented, useToast } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { deleteMyAccount } from "@/lib/account";

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <Card padded style={{ marginTop: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent + "1A", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{title}</Text>
          <Text variant="caption">{description}</Text>
        </View>
      </View>
      {children}
    </Card>
  );
}

// `back` is false when Settings is mounted as a bottom tab (admin) — there is
// no stack to go back to there.
export function Settings({ back = true }: { back?: boolean } = {}) {
  const { colors, spacing, pref, setPref } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmText === "DELETE";

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setConfirmText("");
  };

  const { data: prefs } = useQuery({
    queryKey: ["notif-prefs", user?.id],
    queryFn: async () => (await supabase
      .from("profiles").select("notif_in_app,notif_email").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const updatePref = useMutation({
    mutationFn: async (patch: { notif_in_app?: boolean; notif_email?: boolean }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPending(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  const doDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (e) {
      setDeleting(false);
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };

  return (
    <Screen>
      <Header back={back} title="Settings" icon={<SettingsIcon size={22} color={colors.primary} />} subtitle="Manage your account, appearance, and notification preferences." />

      <Section icon={<Moon size={17} color={colors.accent} />} title="Appearance" description="Switch between light, dark, and system themes.">
        <Segmented
          options={[{ key: "light", label: "Light" }, { key: "dark", label: "Dark" }, { key: "system", label: "System" }]}
          value={pref}
          onChange={(k) => setPref(k as "light" | "dark" | "system")}
        />
      </Section>

      <Section icon={<Mail size={17} color={colors.accent} />} title="Account" description="Your sign-in email address.">
        <Text variant="body">{user?.email}</Text>
      </Section>

      <Section icon={<Lock size={17} color={colors.accent} />} title="Change password" description="Update your password. You'll stay signed in on this device.">
        <View style={{ gap: spacing.md }}>
          <Input
            label="NEW PASSWORD"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <Button title="Update password" size="sm" onPress={changePassword} loading={pending} disabled={!newPassword} style={{ alignSelf: "flex-start" }} />
        </View>
      </Section>

      <Section icon={<Bell size={17} color={colors.accent} />} title="Notifications" description="Control which notifications you receive.">
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="600">In-app notifications</Text>
              <Text variant="caption">Show notifications inside CrewLink.</Text>
            </View>
            <Switch
              value={prefs?.notif_in_app ?? true}
              onValueChange={(v) => updatePref.mutate({ notif_in_app: v })}
              trackColor={{ true: colors.primary, false: colors.surface2 }}
              thumbColor={colors.onPrimary}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="600">Email summaries</Text>
              <Text variant="caption">Get a weekly digest of activity.</Text>
            </View>
            <Switch
              value={prefs?.notif_email ?? true}
              onValueChange={(v) => updatePref.mutate({ notif_email: v })}
              trackColor={{ true: colors.primary, false: colors.surface2 }}
              thumbColor={colors.onPrimary}
            />
          </View>
        </View>
      </Section>

      <Section icon={<LogOut size={17} color={colors.accent} />} title="Sign out" description="Sign out of your account on this device.">
        <Button
          title="Sign out"
          variant="secondary"
          size="sm"
          icon={<LogOut size={16} color={colors.text} />}
          onPress={async () => {
            await signOut();
            toast.success("Signed out");
            router.replace("/(auth)/sign-in");
          }}
          style={{ alignSelf: "flex-start" }}
        />
      </Section>

      <Section icon={<Trash2 size={17} color={colors.accent} />} title="Delete account" description="Permanently delete your account and all associated data. This cannot be undone.">
        <Button
          title="Delete my account"
          variant="destructive"
          size="sm"
          onPress={() => setDeleteOpen(true)}
          icon={<Trash2 size={16} color={colors.onDestructive} />}
          style={{ alignSelf: "flex-start" }}
        />
      </Section>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={closeDelete}>
        <Pressable onPress={closeDelete} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: spacing.lg }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.backgroundElevated,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: spacing.xl,
              }}
            >
              <View style={{ alignItems: "center", marginBottom: spacing.md }}>
                <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: colors.destructive + "1A", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={28} color={colors.destructive} />
                </View>
              </View>

              <Text variant="h2" center>Delete your account?</Text>
              <Text variant="muted" center style={{ marginTop: spacing.sm }}>
                This permanently deletes your profile, applications, submissions, messages, invitations
                {"—"}and, for companies, your internships. This cannot be undone.
              </Text>

              <View style={{ marginTop: spacing.lg }}>
                <Input
                  label={'TYPE "DELETE" TO CONFIRM'}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="DELETE"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
                <Button title="Cancel" variant="secondary" onPress={closeDelete} disabled={deleting} style={{ flex: 1 }} />
                <Button
                  title="Delete account"
                  variant="destructive"
                  onPress={doDelete}
                  disabled={!canDelete}
                  loading={deleting}
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Screen>
  );
}
