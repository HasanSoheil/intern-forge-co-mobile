import { View } from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Send } from "lucide-react-native";
import { Screen, Header, Card, Text, Badge, Button, SearchBar, EmptyState, Loading, useToast } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { capitalize } from "@/lib/utils";

type InvitationRow = {
  id: string;
  status: string;
  message: string | null;
  internship_id: string;
  internships: { title: string } | null;
  companies: { company_name: string } | null;
};

export function Invitations() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["invitations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("id,status,message,internship_id,internships(title),companies(company_name)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as InvitationRow[];
    },
    enabled: !!user,
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("invitations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: () => toast.error("Could not update invitation"),
  });

  const query = q.trim().toLowerCase();
  const filtered = (data ?? []).filter((inv) => {
    if (!query) return true;
    return (
      inv.companies?.company_name?.toLowerCase().includes(query) ||
      inv.internships?.title?.toLowerCase().includes(query) ||
      inv.message?.toLowerCase().includes(query) ||
      inv.status?.toLowerCase().includes(query)
    );
  });

  return (
    <Screen>
      <Header back title="Invitations" />

      <SearchBar value={q} onChangeText={setQ} placeholder="Search invitations…" />

      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <EmptyState
          icon={<Send size={26} color={colors.textMuted} />}
          title="No invitations yet"
          description="Companies will invite you here when your profile matches their internships."
        />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {filtered.map((inv) => (
            <Card key={inv.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={2}>
                    {inv.companies?.company_name} invited you to apply
                  </Text>
                  <Text variant="muted" style={{ marginTop: 2 }} numberOfLines={1}>
                    {inv.internships?.title}
                  </Text>
                  {inv.message ? (
                    <Text variant="muted" style={{ marginTop: spacing.xs, fontStyle: "italic" }} numberOfLines={3}>
                      "{inv.message}"
                    </Text>
                  ) : null}
                </View>
                <View style={{ gap: spacing.sm, alignItems: "flex-end" }}>
                  {inv.status === "pending" ? (
                    <>
                      <Button
                        title="View"
                        size="sm"
                        onPress={() => router.push(`/(app)/internships/${inv.internship_id}` as never)}
                      />
                      <Button
                        title="Decline"
                        size="sm"
                        variant="outline"
                        onPress={() => respond.mutate({ id: inv.id, status: "declined" })}
                      />
                    </>
                  ) : (
                    <Badge label={capitalize(inv.status)} variant="muted" />
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
