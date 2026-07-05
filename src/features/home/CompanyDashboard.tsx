import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Send, TrendingUp, Trophy, Plus, Users } from "lucide-react-native";
import {
  Screen, Header, Card, Text, Button, Badge, SearchBar, Stat, EmptyState, Loading, CompanyMark,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/components/NotificationBell";

interface InternshipRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  role: string | null;
  applications: { id: string }[] | null;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: "success",
  draft: "muted",
  closed: "destructive",
};

export function CompanyDashboard() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["company-dashboard", user?.id],
    queryFn: async () => {
      const [company, internships, sub, apps] = await Promise.all([
        supabase.from("companies").select("company_name").eq("id", user!.id).maybeSingle(),
        supabase
          .from("internships")
          .select("id,title,status,created_at,role,applications(id)")
          .eq("company_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("company_id", user!.id).eq("status", "active").maybeSingle(),
        supabase.from("applications").select("id,internships!inner(company_id)").eq("internships.company_id", user!.id),
      ]);
      return {
        company: company.data,
        internships: (internships.data ?? []) as unknown as InternshipRow[],
        subscription: sub.data,
        applicationCount: apps.data?.length ?? 0,
      };
    },
    enabled: !!user,
  });

  const onRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["company-dashboard", user?.id] });
  }, [qc, user?.id]);

  const hasSub = !!data?.subscription;
  const internships = data?.internships ?? [];
  const query = q.trim().toLowerCase();
  const filtered = internships.filter((i) =>
    !query ||
    (i.title ?? "").toLowerCase().includes(query) ||
    (i.role ?? "").toLowerCase().includes(query),
  );

  if (isLoading && !data) return <Screen scroll={false}><Loading /></Screen>;

  return (
    <Screen refreshing={isLoading} onRefresh={onRefresh}>
      <Header title="Dashboard" subtitle={data?.company?.company_name ?? "Welcome"} right={<NotificationBell />} />

      <Button
        title="New internship"
        icon={<Plus size={16} color={colors.onPrimary} />}
        onPress={() => router.push("/(app)/post")}
      />

      {!hasSub ? (
        <Card padded style={{ marginTop: spacing.lg, borderColor: colors.primary + "55" }}>
          <Text variant="h3">Activate a plan to start posting</Text>
          <Text variant="muted" style={{ marginTop: 4 }}>
            Pick Basic, Pro, or Enterprise — Pro recommended for active hiring.
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title="Choose plan" variant="secondary" size="sm" onPress={() => router.push("/(app)/profile")} />
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
        <Stat icon={<Briefcase size={15} color={colors.primary} />} label="Internships" value={internships.length} />
        <Stat icon={<Send size={15} color={colors.primary} />} label="Applications" value={data?.applicationCount ?? 0} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
        <Stat icon={<Trophy size={15} color={colors.primary} />} label="Plan" value={data?.subscription?.tier ?? "none"} />
        <Stat icon={<TrendingUp size={15} color={colors.primary} />} label="Active" value={internships.filter((i) => i.status === "open").length} />
      </View>

      <Text variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Your internships</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search internships…" />

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        {internships.length === 0 ? (
          <EmptyState
            title="No internships posted"
            description="Post your first internship to start matching."
            actionLabel={hasSub ? "Post one" : "Choose a plan"}
            onAction={() => router.push(hasSub ? "/(app)/post" : "/(app)/profile")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matches" description={`No internships match “${q}”.`} />
        ) : (
          filtered.map((i) => {
            const count = i.applications?.length ?? 0;
            return (
              <Card key={i.id} onPress={() => router.push(`/(app)/internships/${i.id}`)}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
                  <CompanyMark name={i.title} size={44} />
                  <Badge label={i.status} variant={STATUS_VARIANT[i.status] ?? "muted"} />
                </View>
                <Text variant="h3" numberOfLines={1} style={{ marginTop: spacing.md }}>{i.title}</Text>
                {i.role ? <Text variant="caption" style={{ marginTop: 2 }}>{i.role}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md }}>
                  <Users size={14} color={colors.textMuted} />
                  <Text variant="caption">{count} applicant{count === 1 ? "" : "s"}</Text>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
