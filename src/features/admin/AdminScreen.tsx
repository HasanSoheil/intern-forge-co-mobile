import { useMemo, useState } from "react";
import { Alert, Modal, ScrollView, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Building2, Shield, CreditCard, Trash2, Plus, Pencil, X, Check,
} from "lucide-react-native";
import {
  Screen, Header, Card, Text, Button, Input, Badge, Chip, SearchBar, Stat,
  Segmented, Select, EmptyState, Loading, useToast,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";
import { adminDeleteUser, adminCreateAdmin } from "@/lib/account";
import { RevenueChart } from "@/features/admin/RevenueChart";

interface Challenge {
  id: string;
  title: string;
  description: string;
  skill: string;
  field: string | null;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  instructions: string | null;
  required_files: string[] | null;
}

interface Plan {
  tier: string;
  name: string;
  price_cents: number;
  posts_allowed: number;
  invitations_allowed: number;
  features: string[];
  is_popular: boolean;
  active: boolean;
  sort_order: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface FieldRow {
  id: string;
  label: string;
  sort_order: number;
  skills: { id: string; name: string }[];
}

const TABS = [
  { key: "users", label: "Users" },
  { key: "fields", label: "Fields & Skills" },
  { key: "plans", label: "Plans" },
  { key: "challenges", label: "Challenges" },
];

export type AdminSection = "overview" | "users" | "fields" | "plans" | "challenges";

const SECTION_META: Record<AdminSection, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Platform stats and business growth" },
  users: { title: "Users", subtitle: "Manage students, companies, and admins" },
  fields: { title: "Fields & Skills", subtitle: "The catalog students and companies pick from" },
  plans: { title: "Plans", subtitle: "Subscription plans offered to companies" },
  challenges: { title: "Platform Challenges", subtitle: "Challenges that grow student profiles" },
};

// With `section` set, the screen renders that single section (used by the
// admin bottom tabs); without it, it falls back to the all-in-one page.
export function AdminScreen({ section }: { section?: AdminSection } = {}) {
  const { colors, spacing, scheme } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-data"],
    queryFn: async () => {
      const [profiles, students, companies, challenges, fields, skills, plans, subs, admins] =
        await Promise.all([
          supabase.from("profiles").select("id,full_name,email"),
          supabase.from("students").select("id,field,university,progress_percentage,created_at"),
          supabase.from("companies").select("id,company_name,industry,location,created_at"),
          supabase.from("platform_challenges").select("*").order("created_at", { ascending: false }),
          supabase.from("fields").select("id,label,sort_order").order("sort_order"),
          supabase.from("skills").select("id,field_id,name").order("name"),
          supabase.from("plans").select("*").order("sort_order"),
          supabase.from("subscriptions").select("company_id,tier,started_at").eq("status", "active"),
          supabase.from("admins").select("id,created_at"),
        ]);

      const pm = new Map<string, ProfileRow>((profiles.data ?? []).map((p) => [p.id, p as ProfileRow]));
      const skillsByField = new Map<string, { id: string; name: string }[]>();
      for (const sk of skills.data ?? []) {
        const arr = skillsByField.get(sk.field_id) ?? [];
        arr.push({ id: sk.id, name: sk.name });
        skillsByField.set(sk.field_id, arr);
      }
      const planByTier = new Map((plans.data ?? []).map((p) => [p.tier, p as Plan]));
      const subByCompany = new Map((subs.data ?? []).map((s) => [s.company_id, s]));

      const subscriptions = (subs.data ?? [])
        .filter((s) => s.started_at)
        .map((s) => ({ started_at: s.started_at as string, price: (planByTier.get(s.tier)?.price_cents ?? 0) / 100 }));
      const mrr = Math.round(subscriptions.reduce((sum, s) => sum + s.price, 0));

      return {
        students: (students.data ?? []).map((s) => ({ ...s, profile: pm.get(s.id) })),
        companies: (companies.data ?? []).map((c) => {
          const sub = subByCompany.get(c.id);
          const plan = sub ? planByTier.get(sub.tier) : undefined;
          return {
            ...c,
            profile: pm.get(c.id),
            planName: plan?.name ?? (sub ? sub.tier : null),
            priceCents: plan?.price_cents ?? null,
          };
        }),
        challenges: (challenges.data ?? []) as unknown as Challenge[],
        fields: (fields.data ?? []).map(
          (f): FieldRow => ({ ...f, skills: skillsByField.get(f.id) ?? [] }),
        ),
        plans: (plans.data ?? []) as Plan[],
        admins: (admins.data ?? []).map((a) => ({ ...a, profile: pm.get(a.id) })),
        subscriptions,
        mrr,
      };
    },
  });

  const [tab, setTab] = useState<string>(section ?? "users");
  const [q, setQ] = useState("");

  // Business-growth chart — bucket active subscriptions by the selected
  // granularity and accumulate revenue (same logic as the web admin chart).
  const [granularity, setGranularity] = useState<"day" | "month" | "year">("month");
  const chartData = useMemo(() => {
    const keyOf = (iso: string) => {
      const d = iso.slice(0, 10); // YYYY-MM-DD
      return granularity === "day" ? d : granularity === "year" ? d.slice(0, 4) : d.slice(0, 7);
    };
    const map = new Map<string, number>();
    for (const s of data?.subscriptions ?? []) {
      const k = keyOf(s.started_at);
      map.set(k, (map.get(k) ?? 0) + s.price);
    }
    let cum = 0;
    const points = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, revenue]) => {
        cum += revenue;
        return { period, revenue: Math.round(cum) };
      });
    // Anchor from a zero baseline so even a single period renders as a rising line.
    return points.length ? [{ period: "", revenue: 0 }, ...points] : points;
  }, [data?.subscriptions, granularity]);

  const match = (...vals: (string | null | undefined)[]) =>
    !q || vals.some((f) => (f ?? "").toLowerCase().includes(q.toLowerCase()));

  // ---- user mutations -----------------------------------------------------
  const removeUser = useMutation({
    mutationFn: (userId: string) => adminDeleteUser(userId),
    onSuccess: () => {
      toast.success("Account deleted");
      qc.invalidateQueries({ queryKey: ["admin-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const [newAdmin, setNewAdmin] = useState({ fullName: "", email: "", password: "" });
  const addAdmin = useMutation({
    mutationFn: async () => {
      if (!newAdmin.fullName.trim() || !newAdmin.email.trim() || newAdmin.password.length < 6) {
        throw new Error("Name, email, and a 6+ char password are required.");
      }
      await adminCreateAdmin(newAdmin.email.trim(), newAdmin.password, newAdmin.fullName.trim());
    },
    onSuccess: () => {
      toast.success("Admin created");
      setNewAdmin({ fullName: "", email: "", password: "" });
      qc.invalidateQueries({ queryKey: ["admin-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create admin"),
  });

  const confirmDelete = (name: string, onConfirm: () => void) =>
    Alert.alert(
      `Delete ${name}?`,
      "This permanently deletes the account and all of its data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ],
    );

  // ---- catalog refresh + mutations ----------------------------------------
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["catalog-fields"] });
    qc.invalidateQueries({ queryKey: ["catalog-plans"] });
  };
  const onCatalogError = (e: unknown) => {
    // Supabase PostgrestError is a plain object, not always an Error instance —
    // read .message/.code directly so the real cause reaches the toast.
    const err = e as { code?: string; message?: string } | null;
    if (err?.code === "23505") return toast.error("This already exists in the catalog.");
    if (err?.code === "23503") return toast.error("Can't delete — it's still in use.");
    toast.error(err?.message || "Action failed");
  };

  const [newField, setNewField] = useState({ label: "" });
  const addField = useMutation({
    mutationFn: async () => {
      const label = newField.label.trim();
      const id = label.toLowerCase().replace(/\s+/g, "-");
      if (!id || !label) throw new Error("Field label is required.");
      const next = Math.max(0, ...(data?.fields.map((f) => f.sort_order) ?? [0])) + 1;
      const { error } = await supabase.from("fields").insert({ id, label, sort_order: next });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Field added");
      setNewField({ label: "" });
      refresh();
    },
    onError: onCatalogError,
  });
  const renameField = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.from("fields").update({ label }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Field renamed");
      refresh();
    },
    onError: onCatalogError,
  });
  const removeField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Field deleted");
      refresh();
    },
    onError: onCatalogError,
  });
  const addSkill = useMutation({
    mutationFn: async ({ fieldId, name }: { fieldId: string; name: string }) => {
      const { error } = await supabase.from("skills").insert({ field_id: fieldId, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: onCatalogError,
  });
  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: onCatalogError,
  });

  // ---- plans --------------------------------------------------------------
  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const removePlan = useMutation({
    mutationFn: async (tier: string) => {
      const { error } = await supabase.from("plans").delete().eq("tier", tier);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan deleted");
      refresh();
    },
    onError: onCatalogError,
  });

  // ---- challenges ---------------------------------------------------------
  const [chOpen, setChOpen] = useState(false);
  const [editingCh, setEditingCh] = useState<Challenge | null>(null);
  const removeChallenge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge deleted");
      qc.invalidateQueries({ queryKey: ["admin-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm, marginTop: spacing.md }}>
      {icon}
      <Text variant="h3">{title}</Text>
    </View>
  );

  return (
    <Screen>
      <Header
        title={section ? SECTION_META[section].title : "Admin"}
        subtitle={section ? SECTION_META[section].subtitle : "Manage users and platform challenges"}
      />

      {/* Stat grid — Overview tab only (and the all-in-one fallback) */}
      {(!section || section === "overview") && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <View style={{ flexBasis: "48%", flexGrow: 1 }}>
            <Stat label="Students" value={data?.students.length ?? 0} icon={<Users size={14} color={colors.primary} />} />
          </View>
          <View style={{ flexBasis: "48%", flexGrow: 1 }}>
            <Stat label="Companies" value={data?.companies.length ?? 0} icon={<Building2 size={14} color={colors.violet} />} />
          </View>
          <View style={{ flexBasis: "48%", flexGrow: 1 }}>
            <Stat label="Admins" value={data?.admins.length ?? 0} icon={<Shield size={14} color={colors.accent} />} />
          </View>
          <View style={{ flexBasis: "48%", flexGrow: 1 }}>
            <Stat label="MRR" value={`$${data?.mrr ?? 0}`} icon={<CreditCard size={14} color={colors.success} />} />
          </View>
        </View>
      )}

      {/* Business growth — cumulative subscription revenue (mirrors the web chart) */}
      {(!section || section === "overview") && (
        <Card padded style={{ marginTop: spacing.md }}>
          <Text variant="h3">Business growth</Text>
          <Text variant="caption" style={{ marginTop: 2 }}>Cumulative subscription revenue over time</Text>
          <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            <Segmented
              options={[
                { key: "day", label: "Day" },
                { key: "month", label: "Month" },
                { key: "year", label: "Year" },
              ]}
              value={granularity}
              onChange={(k) => setGranularity(k as "day" | "month" | "year")}
            />
          </View>
          {chartData.length >= 2 ? (
            <RevenueChart
              points={chartData}
              color={scheme === "dark" ? colors.primaryDim : colors.primary}
              grid={colors.cardBorder}
              ink={colors.textMuted}
              inkStrong={colors.text}
            />
          ) : (
            <Text variant="muted" style={{ marginTop: spacing.sm }}>
              No active subscriptions to chart yet.
            </Text>
          )}
        </Card>
      )}

      {!section && (
        <View style={{ marginTop: spacing.lg }}>
          <Segmented options={TABS} value={tab} onChange={setTab} />
        </View>
      )}

      {tab !== "overview" && (
        <View style={{ marginTop: spacing.md }}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search…" />
        </View>
      )}

      {isLoading ? (
        <View style={{ marginTop: spacing.xl }}>
          <Loading />
        </View>
      ) : tab === "overview" ? null : tab === "users" ? (
        <View style={{ marginTop: spacing.md }}>
          {/* Students */}
          {sectionTitle(<Users size={16} color={colors.primary} />, `Students (${data?.students.length ?? 0})`)}
          {(() => {
            const rows = (data?.students ?? []).filter((s) =>
              match(s.profile?.full_name, s.profile?.email, s.field, s.university),
            );
            if (!rows.length) return <Text variant="muted">No students.</Text>;
            return (
              <View style={{ gap: spacing.sm }}>
                {rows.map((s) => (
                  <Card key={s.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="body"
                          weight="700"
                          color="primary"
                          onPress={() => router.push(`/(app)/students/${s.id}` as never)}
                        >
                          {s.profile?.full_name ?? "—"}
                        </Text>
                        <Text variant="muted" numberOfLines={1}>{s.profile?.email ?? "—"}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 }}>
                          <Text variant="caption" style={{ textTransform: "capitalize" }}>
                            {s.field ?? "—"}
                          </Text>
                          <Text variant="caption">· {s.university ?? "—"}</Text>
                          <Text variant="caption">· {s.progress_percentage ?? 0}%</Text>
                        </View>
                      </View>
                      <Button
                        title="Delete"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={15} color={colors.destructive} />}
                        onPress={() =>
                          confirmDelete(
                            s.profile?.full_name ?? s.profile?.email ?? "this student",
                            () => removeUser.mutate(s.id),
                          )
                        }
                      />
                    </View>
                  </Card>
                ))}
              </View>
            );
          })()}

          {/* Companies */}
          {sectionTitle(<Building2 size={16} color={colors.violet} />, `Companies (${data?.companies.length ?? 0})`)}
          {(() => {
            const rows = (data?.companies ?? []).filter((c) =>
              match(c.company_name, c.profile?.email, c.industry, c.location, c.planName),
            );
            if (!rows.length) return <Text variant="muted">No companies.</Text>;
            return (
              <View style={{ gap: spacing.sm }}>
                {rows.map((c) => (
                  <Card key={c.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="700" numberOfLines={1}>{c.company_name}</Text>
                        <Text variant="muted" numberOfLines={1}>{c.profile?.email ?? "—"}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginTop: 6 }}>
                          <Text variant="caption">{c.industry ?? "—"}</Text>
                          {c.planName ? (
                            <Badge label={c.planName} variant="primary" />
                          ) : (
                            <Text variant="caption" color="textFaint">Free</Text>
                          )}
                          {c.priceCents != null ? (
                            <Text variant="caption">${Math.round(c.priceCents / 100)}/mo</Text>
                          ) : null}
                        </View>
                      </View>
                      <Button
                        title="Delete"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={15} color={colors.destructive} />}
                        onPress={() => confirmDelete(c.company_name, () => removeUser.mutate(c.id))}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            );
          })()}

          {/* Admins */}
          {sectionTitle(<Shield size={16} color={colors.accent} />, `Admins (${data?.admins.length ?? 0})`)}
          <Card>
            <Text variant="label" style={{ marginBottom: spacing.sm }}>Add admin</Text>
            <View style={{ gap: spacing.sm }}>
              <Input
                label="Name"
                value={newAdmin.fullName}
                onChangeText={(t) => setNewAdmin((a) => ({ ...a, fullName: t }))}
                placeholder="Jane Admin"
              />
              <Input
                label="Email"
                value={newAdmin.email}
                onChangeText={(t) => setNewAdmin((a) => ({ ...a, email: t }))}
                placeholder="admin@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Password"
                value={newAdmin.password}
                onChangeText={(t) => setNewAdmin((a) => ({ ...a, password: t }))}
                placeholder="6+ characters"
                autoCapitalize="none"
              />
              <Button
                title="Add admin"
                onPress={() => addAdmin.mutate()}
                loading={addAdmin.isPending}
                icon={<Plus size={16} color={colors.onPrimary} />}
              />
            </View>
          </Card>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {(() => {
              const rows = (data?.admins ?? []).filter((a) =>
                match(a.profile?.full_name, a.profile?.email),
              );
              if (!rows.length) return <Text variant="muted">No admins.</Text>;
              return rows.map((a) => (
                <Card key={a.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="700">{a.profile?.full_name ?? "—"}</Text>
                      <Text variant="muted" numberOfLines={1}>{a.profile?.email ?? "—"}</Text>
                    </View>
                    <Button
                      title="Delete"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={15} color={colors.destructive} />}
                      onPress={() =>
                        confirmDelete(
                          a.profile?.full_name ?? a.profile?.email ?? "this admin",
                          () => removeUser.mutate(a.id),
                        )
                      }
                    />
                  </View>
                </Card>
              ));
            })()}
          </View>
        </View>
      ) : tab === "fields" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Card>
            <Text variant="label" style={{ marginBottom: spacing.sm }}>Add field</Text>
            <View style={{ gap: spacing.sm }}>
              <Input
                label="Label"
                value={newField.label}
                onChangeText={(t) => setNewField({ label: t })}
                placeholder="Frontend"
              />
              {newField.label.trim() ? (
                <Text variant="caption">
                  id: {newField.label.trim().toLowerCase().replace(/\s+/g, "-")}
                </Text>
              ) : null}
              <Button
                title="Add field"
                onPress={() => addField.mutate()}
                loading={addField.isPending}
                icon={<Plus size={16} color={colors.onPrimary} />}
              />
            </View>
          </Card>

          {(() => {
            const rows = (data?.fields ?? []).filter((f) =>
              match(f.id, f.label, ...f.skills.map((sk) => sk.name)),
            );
            if (!rows.length) return <Text variant="muted">No fields yet — add one above.</Text>;
            return rows.map((f) => (
              <FieldCard
                key={f.id}
                field={f}
                onRename={(label) => renameField.mutate({ id: f.id, label })}
                onDelete={() =>
                  Alert.alert(
                    `Delete field "${f.label}"?`,
                    "Removes the field and its skills. Saved values on students/internships are kept.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => removeField.mutate(f.id) },
                    ],
                  )
                }
                onRemoveSkill={(skillId) => removeSkill.mutate(skillId)}
                onAddSkill={(name) => addSkill.mutate({ fieldId: f.id, name })}
              />
            ));
          })()}
        </View>
      ) : tab === "plans" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Button
            title="Add plan"
            onPress={() => {
              setEditingPlan(null);
              setPlanOpen(true);
            }}
            icon={<Plus size={16} color={colors.onPrimary} />}
          />
          {(() => {
            const rows = (data?.plans ?? []).filter((p) => match(p.tier, p.name));
            if (!rows.length) return <Text variant="muted">No plans.</Text>;
            return rows.map((p) => (
              <Card key={p.tier} padded highlight={p.is_popular}>
                {/* Name + status badges */}
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm }}>
                  <Text variant="h3" style={{ flexShrink: 1 }}>{p.name}</Text>
                  {p.is_popular ? <Badge label="Popular" variant="accent" /> : null}
                  {p.active ? (
                    <Badge label="Active" variant="success" />
                  ) : (
                    <Badge label="Hidden" variant="muted" />
                  )}
                </View>
                <Text variant="caption" style={{ marginTop: 2 }}>tier: {p.tier}</Text>

                {/* Price */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: spacing.md }}>
                  <Text variant="display" style={{ fontSize: 34, lineHeight: 38 }}>
                    ${Math.round(p.price_cents / 100)}
                  </Text>
                  <Text variant="muted" style={{ marginBottom: 4 }}>/month</Text>
                </View>

                {/* Quotas */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.cardBorder }}>
                    <Text variant="caption" color="text">{p.posts_allowed} internship posts</Text>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.cardBorder }}>
                    <Text variant="caption" color="text">{p.invitations_allowed} invitations</Text>
                  </View>
                </View>

                {/* Features */}
                {p.features?.length ? (
                  <View style={{ marginTop: spacing.md, gap: 8 }}>
                    {p.features.map((f) => (
                      <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Check size={14} color={colors.primary} />
                        <Text variant="muted" style={{ flex: 1 }}>{f}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
                  <Button
                    title="Edit"
                    variant="secondary"
                    size="sm"
                    icon={<Pencil size={15} color={colors.text} />}
                    style={{ flex: 1 }}
                    onPress={() => {
                      setEditingPlan(p);
                      setPlanOpen(true);
                    }}
                  />
                  <Button
                    title="Delete"
                    variant="outline"
                    size="sm"
                    icon={<Trash2 size={15} color={colors.destructive} />}
                    style={{ flex: 1 }}
                    onPress={() =>
                      Alert.alert(
                        `Delete plan "${p.name}"?`,
                        "Companies already on this plan keep their subscription; it just won't be offered to new ones.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => removePlan.mutate(p.tier) },
                        ],
                      )
                    }
                  />
                </View>
              </Card>
            ));
          })()}
        </View>
      ) : (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Button
            title="Add challenge"
            onPress={() => {
              setEditingCh(null);
              setChOpen(true);
            }}
            icon={<Plus size={16} color={colors.onPrimary} />}
          />
          {(() => {
            const rows = (data?.challenges ?? []).filter((c) =>
              match(c.title, c.field, c.skill, c.difficulty),
            );
            if (!rows.length) return <Text variant="muted">No challenges yet.</Text>;
            return rows.map((c) => (
              <Card key={c.id}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="700" numberOfLines={2}>{c.title}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginTop: 6 }}>
                      {c.field ? <Badge label={c.field} variant="violet" /> : null}
                      <Badge label={c.skill} variant="primary" />
                      <Badge label={c.difficulty} variant="muted" />
                      <Text variant="caption">{c.points} pts</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Button
                      title="Edit"
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={15} color={colors.primary} />}
                      onPress={() => {
                        setEditingCh(c);
                        setChOpen(true);
                      }}
                    />
                    <Button
                      title="Delete"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={15} color={colors.destructive} />}
                      onPress={() =>
                        Alert.alert(
                          `Delete "${c.title}"?`,
                          "This removes the platform challenge. Existing submissions are unaffected.",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => removeChallenge.mutate(c.id) },
                          ],
                        )
                      }
                    />
                  </View>
                </View>
              </Card>
            ));
          })()}
        </View>
      )}

      <PlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        editing={editingPlan}
        onSaved={() => {
          setPlanOpen(false);
          refresh();
        }}
      />
      <ChallengeModal
        open={chOpen}
        onClose={() => setChOpen(false)}
        editing={editingCh}
        fields={(data?.fields ?? []).map((f) => ({ id: f.id, label: f.label }))}
        onSaved={() => {
          setChOpen(false);
          qc.invalidateQueries({ queryKey: ["admin-data"] });
        }}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
function FieldCard({
  field,
  onRename,
  onDelete,
  onRemoveSkill,
  onAddSkill,
}: {
  field: FieldRow;
  onRename: (label: string) => void;
  onDelete: () => void;
  onRemoveSkill: (id: string) => void;
  onAddSkill: (name: string) => void;
}) {
  const { colors, spacing } = useTheme();
  const [label, setLabel] = useState(field.label);
  const [skill, setSkill] = useState("");

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            value={label}
            onChangeText={setLabel}
            onSubmitEditing={() => {
              const v = label.trim();
              if (v && v !== field.label) onRename(v);
            }}
            returnKeyType="done"
          />
        </View>
        <Button
          title="Delete"
          variant="ghost"
          size="sm"
          icon={<Trash2 size={15} color={colors.destructive} />}
          onPress={onDelete}
        />
      </View>
      <Text variant="caption" style={{ marginTop: 4 }}>{field.id}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
        {field.skills.length ? (
          field.skills.map((sk) => (
            <SkillChip key={sk.id} name={sk.name} onRemove={() => onRemoveSkill(sk.id)} />
          ))
        ) : (
          <Text variant="caption">No skills yet.</Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Input
            value={skill}
            onChangeText={setSkill}
            placeholder="Add a skill…"
            onSubmitEditing={() => {
              if (skill.trim()) {
                onAddSkill(skill.trim());
                setSkill("");
              }
            }}
            returnKeyType="done"
          />
        </View>
        <Button
          title="Add"
          variant="outline"
          size="sm"
          icon={<Plus size={15} color={colors.text} />}
          onPress={() => {
            if (skill.trim()) {
              onAddSkill(skill.trim());
              setSkill("");
            }
          }}
        />
      </View>
    </Card>
  );
}

function SkillChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Chip label={name} />
      <Text
        onPress={onRemove}
        style={{ marginLeft: -10, marginRight: 4 }}
        accessibilityLabel={`Remove ${name}`}
      >
        <X size={14} color={colors.destructive} />
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
function ModalShell({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: colors.backgroundElevated,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: "90%",
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <Text variant="h3" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>{title}</Text>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            {children}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              padding: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
            }}
          >
            {footer}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
      <Text variant="body">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surface2, true: colors.primary }}
        thumbColor={colors.onPrimary}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
function PlanModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Plan | null;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState({
    tier: "",
    name: "",
    price: "0",
    posts: "0",
    invites: "0",
    features: "",
    popular: false,
    active: true,
    sort: "0",
  });
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (open && syncedId !== (editing?.tier ?? "new")) {
    setSyncedId(editing?.tier ?? "new");
    setForm({
      tier: editing?.tier ?? "",
      name: editing?.name ?? "",
      price: editing ? String(Math.round(editing.price_cents / 100)) : "0",
      posts: String(editing?.posts_allowed ?? 0),
      invites: String(editing?.invitations_allowed ?? 0),
      features: (editing?.features ?? []).join("\n"),
      popular: editing?.is_popular ?? false,
      active: editing?.active ?? true,
      sort: String(editing?.sort_order ?? 0),
    });
  }
  if (!open && syncedId !== null) setSyncedId(null);

  const save = useMutation({
    mutationFn: async () => {
      const tier = form.tier.trim().toLowerCase();
      if (!tier || !form.name.trim()) throw new Error("Tier key and name are required.");
      const payload = {
        tier,
        name: form.name.trim(),
        price_cents: Math.round((Number(form.price) || 0) * 100),
        posts_allowed: Number(form.posts) || 0,
        invitations_allowed: Number(form.invites) || 0,
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        is_popular: form.popular,
        active: form.active,
        sort_order: Number(form.sort) || 0,
      };
      const { error } = editing
        ? await supabase.from("plans").update(payload).eq("tier", editing.tier)
        : await supabase.from("plans").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Plan updated" : "Plan created");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={editing ? "Edit plan" : "New plan"}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={save.isPending} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={editing ? "Save changes" : "Create plan"}
              onPress={() => save.mutate()}
              loading={save.isPending}
              fullWidth
            />
          </View>
        </>
      }
    >
      <Input
        label="Tier key"
        value={form.tier}
        editable={!editing}
        onChangeText={(t) => setForm((f) => ({ ...f, tier: t }))}
        placeholder="pro"
        autoCapitalize="none"
      />
      <Input
        label="Name"
        value={form.name}
        onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
        placeholder="Pro"
      />
      <Input
        label="Price ($/mo)"
        value={form.price}
        onChangeText={(t) => setForm((f) => ({ ...f, price: t }))}
        keyboardType="numeric"
      />
      <Input
        label="Posts allowed"
        value={form.posts}
        onChangeText={(t) => setForm((f) => ({ ...f, posts: t }))}
        keyboardType="numeric"
      />
      <Input
        label="Invitations allowed"
        value={form.invites}
        onChangeText={(t) => setForm((f) => ({ ...f, invites: t }))}
        keyboardType="numeric"
      />
      <Input
        label="Features (one per line)"
        value={form.features}
        onChangeText={(t) => setForm((f) => ({ ...f, features: t }))}
        multiline
      />
      <SwitchRow label="Most popular" value={form.popular} onValueChange={(v) => setForm((f) => ({ ...f, popular: v }))} />
      <SwitchRow label="Active" value={form.active} onValueChange={(v) => setForm((f) => ({ ...f, active: v }))} />
      <Input
        label="Sort order"
        value={form.sort}
        onChangeText={(t) => setForm((f) => ({ ...f, sort: t }))}
        keyboardType="numeric"
      />
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
function ChallengeModal({
  open,
  onClose,
  editing,
  fields,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Challenge | null;
  fields: { id: string; label: string }[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    skill: "",
    field: "",
    difficulty: "easy",
    points: "10",
    instructions: "",
    files: "",
  });
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (open && syncedId !== (editing?.id ?? "new")) {
    setSyncedId(editing?.id ?? "new");
    setForm({
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      skill: editing?.skill ?? "",
      field: editing?.field ?? "",
      difficulty: editing?.difficulty ?? "easy",
      points: editing?.points?.toString() ?? "10",
      instructions: editing?.instructions ?? "",
      files: (editing?.required_files ?? []).join(", "),
    });
  }
  if (!open && syncedId !== null) setSyncedId(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        skill: form.skill.trim(),
        field: form.field || null,
        difficulty: form.difficulty as "easy" | "medium" | "hard",
        points: form.points ? Number(form.points) : 10,
        instructions: form.instructions.trim() || null,
        required_files: form.files.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (!payload.title || !payload.description || !payload.skill) {
        throw new Error("Title, description and skill are required.");
      }
      const { error } = editing
        ? await supabase.from("platform_challenges").update(payload).eq("id", editing.id)
        : await supabase.from("platform_challenges").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Challenge updated" : "Challenge created");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={editing ? "Edit challenge" : "New platform challenge"}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={save.isPending} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={editing ? "Save changes" : "Create challenge"}
              onPress={() => save.mutate()}
              loading={save.isPending}
              fullWidth
            />
          </View>
        </>
      }
    >
      <Input
        label="Title"
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
      />
      <Input
        label="Description"
        value={form.description}
        onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
        multiline
      />
      <Select
        label="Field"
        value={form.field || "none"}
        placeholder="Select a field"
        options={[{ label: "— None —", value: "none" }, ...fields.map((fl) => ({ label: fl.label, value: fl.id }))]}
        onChange={(v) => setForm((f) => ({ ...f, field: v === "none" ? "" : v }))}
      />
      <Input
        label="Skill"
        value={form.skill}
        onChangeText={(t) => setForm((f) => ({ ...f, skill: t }))}
        placeholder="React"
      />
      <Select
        label="Difficulty"
        value={form.difficulty}
        options={[
          { label: "Easy", value: "easy" },
          { label: "Medium", value: "medium" },
          { label: "Hard", value: "hard" },
        ]}
        onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}
      />
      <Input
        label="Points"
        value={form.points}
        onChangeText={(t) => setForm((f) => ({ ...f, points: t }))}
        keyboardType="numeric"
      />
      <Input
        label="Instructions"
        value={form.instructions}
        onChangeText={(t) => setForm((f) => ({ ...f, instructions: t }))}
        placeholder="What the student must build/submit…"
        multiline
      />
      <Input
        label="Required files (comma-separated)"
        value={form.files}
        onChangeText={(t) => setForm((f) => ({ ...f, files: t }))}
        placeholder="README.md, package.json"
        autoCapitalize="none"
      />
    </ModalShell>
  );
}
