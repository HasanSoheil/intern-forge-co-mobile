import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Check } from "lucide-react-native";
import { Screen, Text, Input, Button, Card, Badge, ProgressBar, useToast, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { usePlans, formatPrice, type PlanDef } from "@/lib/catalog";
import { createCheckoutSession, confirmCheckout } from "@/lib/billing";
import { supabase } from "@/lib/supabase";
import { capitalize } from "@/lib/utils";

export function CompanyOnboarding() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [co, setCo] = useState({ company_name: "", description: "", website: "", industry: "", location: "", size: "" });
  const [saving, setSaving] = useState(false);
  const [busyTier, setBusyTier] = useState<string | null>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-onboarding", user?.id],
    queryFn: async () => (await supabase.from("companies").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  useEffect(() => {
    if (!company) return;
    setCo({
      company_name: company.company_name ?? "",
      description: company.description ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      location: company.location ?? "",
      size: company.size ?? "",
    });
  }, [company]);

  const { data: plans = [] } = usePlans();
  const { data: activeSub } = useQuery({
    queryKey: ["company-sub-gate", user?.id],
    queryFn: async () =>
      (await supabase.from("subscriptions").select("*").eq("company_id", user!.id).eq("status", "active").maybeSingle()).data,
    enabled: !!user,
  });

  const saveInfo = async () => {
    if (!user) return;
    if (!co.company_name.trim()) return toast.error("Enter your company name");
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        company_name: co.company_name.trim(),
        description: co.description.trim() || null,
        website: co.website.trim() || null,
        industry: co.industry.trim() || null,
        location: co.location.trim() || null,
        size: co.size.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["company-onboarding", user.id] });
    qc.invalidateQueries({ queryKey: ["my-company"] });
    setStep(2);
  };

  const subscribe = async (plan: PlanDef) => {
    setBusyTier(plan.tier);
    try {
      const returnUrl = Linking.createURL("/onboarding");
      const { url } = await createCheckoutSession(plan.tier, returnUrl);
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type !== "success" || !result.url) {
        if (result.type === "cancel" || result.type === "dismiss") toast.info("Checkout canceled — no charge was made.");
        return;
      }
      const parsed = Linking.parse(result.url);
      const sessionId = parsed.queryParams?.session_id;
      if (parsed.queryParams?.canceled) {
        toast.info("Checkout canceled — no charge was made.");
        return;
      }
      if (typeof sessionId !== "string") return;
      const r = await confirmCheckout(sessionId);
      toast.success(`${capitalize(r.tier)} plan activated!`);
      qc.invalidateQueries({ queryKey: ["company-sub-gate", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-sub"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusyTier(null);
    }
  };

  const finish = () => {
    qc.invalidateQueries({ queryKey: ["company-sub-gate", user?.id] });
    router.replace("/(app)");
  };

  if (isLoading || !user) return <Screen scroll={false}><Loading /></Screen>;

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg }}>
        <Building2 size={16} color={colors.primary} />
        <Text variant="label" color="primary">STEP {step} OF 2</Text>
      </View>
      <ProgressBar value={(step / 2) * 100} height={6} />

      <Text variant="title" style={{ marginTop: spacing.lg }}>
        {step === 1 ? "Tell us about your company" : "Choose your plan"}
      </Text>
      <Text variant="muted" style={{ marginTop: 4 }}>
        {step === 1
          ? "Students see this in 'About the company' on your internships."
          : "Activate a plan to start posting internships and inviting students."}
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        {step === 1 ? (
          <View style={{ gap: spacing.md }}>
            <Input label="COMPANY NAME" value={co.company_name} onChangeText={(t) => setCo({ ...co, company_name: t })} placeholder="Acme Inc." />
            <Input label="ABOUT" value={co.description} onChangeText={(t) => setCo({ ...co, description: t })} placeholder="What your company does, mission, culture…" multiline />
            <Input label="WEBSITE" value={co.website} onChangeText={(t) => setCo({ ...co, website: t })} placeholder="https://yourcompany.com" autoCapitalize="none" keyboardType="url" />
            <Input label="INDUSTRY" value={co.industry} onChangeText={(t) => setCo({ ...co, industry: t })} placeholder="Fintech" />
            <Input label="LOCATION" value={co.location} onChangeText={(t) => setCo({ ...co, location: t })} placeholder="Beirut, LB" />
            <Input label="TEAM SIZE" value={co.size} onChangeText={(t) => setCo({ ...co, size: t })} placeholder="11-50" />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <CreditCard size={16} color={colors.accent} />
              <Text variant="caption" style={{ flex: 1 }}>
                Secure Stripe checkout (test mode) — use card 4242 4242 4242 4242, any future date & CVC.
              </Text>
            </View>

            {activeSub?.tier ? (
              <Badge label={`Active: ${capitalize(activeSub.tier)} plan`} variant="success" icon={<Check size={12} color={colors.success} />} />
            ) : null}

            {plans.map((p) => {
              const isActive = activeSub?.tier === p.tier;
              return (
                <Card key={p.tier} padded highlight={p.is_popular || isActive}>
                  {p.is_popular ? <Text variant="caption" color="primary" weight="700">Most popular</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: p.is_popular ? spacing.sm : 0 }}>
                    <View>
                      <Text variant="h3">{p.name}</Text>
                      <Text variant="muted">{p.posts_allowed} posts · {p.invitations_allowed} invites</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text variant="title">{formatPrice(p.price_cents)}</Text>
                      <Text variant="caption">/mo</Text>
                    </View>
                  </View>
                  {p.features?.length ? (
                    <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                      {p.features.map((f) => (
                        <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Check size={15} color={colors.accent} />
                          <Text variant="muted" style={{ flex: 1 }}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Button
                    title={isActive ? "Current plan" : busyTier ? "Opening checkout…" : `Subscribe to ${p.name}`}
                    onPress={() => subscribe(p)}
                    disabled={isActive || busyTier !== null}
                    loading={busyTier === p.tier}
                    size="sm"
                    variant={isActive ? "secondary" : "primary"}
                    fullWidth
                    style={{ marginTop: spacing.md }}
                  />
                </Card>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => setStep(1)} disabled={step === 1} />
        {step === 1 ? (
          <Button title={saving ? "Saving…" : "Continue"} onPress={saveInfo} loading={saving} style={{ flex: 1, maxWidth: 200 }} />
        ) : (
          <Button
            title="Finish"
            onPress={finish}
            disabled={!activeSub}
            style={{ flex: 1, maxWidth: 200 }}
          />
        )}
      </View>
      {step === 2 && !activeSub ? (
        <Text variant="caption" center style={{ marginTop: spacing.sm }}>
          Subscribe to a plan to finish setup.
        </Text>
      ) : null}
    </Screen>
  );
}
