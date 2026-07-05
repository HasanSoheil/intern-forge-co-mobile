import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  Sparkles, Briefcase, Send, TrendingUp, Trophy, GitBranch, GraduationCap, MapPin, Eye,
  Globe, ExternalLink, UserRound, Building2, CreditCard, Check,
} from "lucide-react-native";
import {
  Screen, Header, Card, Text, Button, Input, Badge, ProgressBar, Stat, Loading, useToast,
} from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { createCheckoutSession, confirmCheckout } from "@/lib/billing";
import { usePlans, formatPrice, type PlanDef } from "@/lib/catalog";
import { capitalize, clockTime } from "@/lib/utils";
import { StudentFeed } from "@/components/StudentFeed";

export function ProfileScreen() {
  const { role } = useAuth();
  if (role === "company") return <CompanyProfile />;
  return <StudentProfile />;
}

/* ─────────────────────────── Student profile ─────────────────────────── */

interface ViewRow {
  id: string;
  viewer_id: string;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

function StudentProfile() {
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["student-profile", user?.id],
    queryFn: async () => {
      const [student, profile, apps, invs, subs, views] = await Promise.all([
        supabase.from("students").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("applications").select("id,status,match_score").eq("student_id", user!.id),
        supabase.from("invitations").select("id,status").eq("student_id", user!.id).eq("status", "pending"),
        supabase.from("challenge_submissions").select("id,score,status,submitted_at").eq("student_id", user!.id).order("submitted_at", { ascending: false }).limit(10),
        supabase.from("profile_views").select("id,viewer_id,created_at,profiles:viewer_id(full_name,email)").eq("viewed_id", user!.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        student: student.data,
        profile: profile.data,
        applications: apps.data ?? [],
        invitations: invs.data ?? [],
        submissions: (subs.data ?? []) as Array<{ score: number }>,
        views: (views.data ?? []) as unknown as ViewRow[],
      };
    },
    enabled: !!user,
  });

  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  useEffect(() => {
    if (!data?.student) return;
    const s = data.student as Record<string, unknown> & { bio?: string; portfolio_url?: string };
    setBio(s.bio ?? "");
    setPortfolioUrl(s.portfolio_url ?? "");
  }, [data?.student]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").update({
        bio,
        portfolio_url: portfolioUrl || null,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["student-profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) {
    return (
      <Screen>
        <Header title="Profile" back />
        <Loading />
      </Screen>
    );
  }

  const student = data?.student;
  const profile = data?.profile;
  const name = profile?.full_name ?? profile?.email ?? "You";
  const progress = student?.progress_percentage ?? 0;
  const submissions = data?.submissions ?? [];
  const avgScore = Math.round((submissions.reduce((a, s) => a + (s.score ?? 0), 0)) / Math.max(1, submissions.length));

  return (
    <Screen>
      <Header title="Profile" back />

      {/* Header card */}
      <Card padded>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title" numberOfLines={1}>{name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
              <Text variant="caption" style={{ textTransform: "capitalize" }}>{student?.field ?? "—"}</Text>
              {student?.desired_role ? <Text variant="caption">· {student.desired_role}</Text> : null}
              {student?.university ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <GraduationCap size={13} color={colors.textFaint} />
                  <Text variant="caption">{student.university}</Text>
                </View>
              ) : null}
              {student?.location ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MapPin size={13} color={colors.textFaint} />
                  <Text variant="caption">{student.location}</Text>
                </View>
              ) : null}
              {student?.github_username ? (
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(`https://github.com/${student.github_username}`)}
                  hitSlop={6}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <GitBranch size={13} color={colors.primary} />
                  <Text variant="caption" color="primary" weight="600">@{student.github_username}</Text>
                </Pressable>
              ) : null}
            </View>
            {student?.bio ? <Text variant="muted" style={{ marginTop: spacing.md }}>{student.bio}</Text> : null}
            {student?.skills?.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md }}>
                {student.skills.map((s: string) => <Badge key={s} label={s} variant="muted" />)}
              </View>
            ) : null}
          </View>
        </View>
        <Button
          title="Edit basics"
          variant="outline"
          size="sm"
          onPress={() => router.push("/onboarding" as never)}
          style={{ alignSelf: "flex-start", marginTop: spacing.md }}
        />
      </Card>

      {/* Profile strength */}
      <Card padded style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text variant="label">PROFILE STRENGTH</Text>
            <Text variant="display" color="primary" style={{ marginTop: 2 }}>{progress}%</Text>
          </View>
          <Button
            title="Boost"
            size="sm"
            icon={<Sparkles size={15} color={colors.onPrimary} />}
            onPress={() => router.push("/(app)/(tabs)/discover" as never)}
          />
        </View>
        <ProgressBar value={progress} height={10} />
        <Text variant="caption" style={{ marginTop: spacing.sm }}>
          {student?.challenges_completed ?? 0} platform challenges completed · {student?.skills?.length ?? 0} skills
        </Text>
      </Card>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }}>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <Stat icon={<Briefcase size={14} color={colors.violet} />} label="Applications" value={data?.applications.length ?? 0} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <Stat icon={<Send size={14} color={colors.violet} />} label="Invitations" value={data?.invitations.length ?? 0} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <Stat icon={<Trophy size={14} color={colors.violet} />} label="Submissions" value={submissions.length} />
        </View>
        <View style={{ flexBasis: "48%", flexGrow: 1 }}>
          <Stat icon={<TrendingUp size={14} color={colors.violet} />} label="Avg score" value={avgScore} />
        </View>
      </View>

      {/* About you */}
      <Card padded style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "1A", alignItems: "center", justifyContent: "center" }}>
            <UserRound size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3">About you</Text>
            <Text variant="caption">Your bio and portfolio link — shown to companies.</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Input
            label="BIO"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell companies who you are, what you build, and what you're looking for…"
            multiline
          />
          <Text variant="caption" style={{ textAlign: "right" }}>{bio.length} characters</Text>

          <Input
            label="PORTFOLIO"
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            placeholder="https://your-portfolio.com"
            autoCapitalize="none"
            keyboardType="url"
            icon={<Globe size={16} color={colors.textFaint} />}
          />
          {portfolioUrl ? (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(portfolioUrl)}
              hitSlop={6}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
            >
              <Text variant="caption" color="primary" weight="600">Open link</Text>
              <ExternalLink size={12} color={colors.primary} />
            </Pressable>
          ) : null}

          <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} style={{ alignSelf: "flex-end" }} size="sm" />
        </View>
      </Card>

      {/* Recent profile views */}
      <Card padded style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Eye size={16} color={colors.text} />
          <Text variant="h3">Recent profile views</Text>
        </View>
        {data?.views.length ? (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {data.views.map((v) => (
              <View key={v.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {v.profiles?.full_name ?? v.profiles?.email ?? "Someone"}
                </Text>
                <Text variant="caption">{clockTime(v.created_at)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" style={{ marginTop: spacing.sm }}>No one has viewed your profile yet.</Text>
        )}
      </Card>

      {/* Portfolio feed */}
      <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
        <Text variant="h3">Portfolio feed</Text>
        <Text variant="caption" style={{ marginBottom: spacing.sm }}>
          Post projects, demos, and achievements with images & video — this is what companies see.
        </Text>
        {user ? <StudentFeed studentId={user.id} editable authorName={name} /> : null}
      </View>
    </Screen>
  );
}

/* ─────────────────────────── Company profile ─────────────────────────── */

const PLAN_GRADS = ["gradCyan", "gradViolet", "gradLime"] as const;

function CompanyProfile() {
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: company } = useQuery({
    queryKey: ["my-company", user?.id],
    queryFn: async () => (await supabase.from("companies").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const [co, setCo] = useState({ company_name: "", description: "", website: "", industry: "", location: "", size: "" });
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

  const saveCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update({
        company_name: co.company_name.trim() || "Company",
        description: co.description.trim() || null,
        website: co.website.trim() || null,
        industry: co.industry.trim() || null,
        location: co.location.trim() || null,
        size: co.size.trim() || null,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company profile saved"); qc.invalidateQueries({ queryKey: ["my-company"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const { data: plans = [] } = usePlans();
  const { data: current } = useQuery({
    queryKey: ["my-sub", user?.id],
    queryFn: async () => (await supabase.from("subscriptions").select("*").eq("company_id", user!.id).eq("status", "active").maybeSingle()).data,
    enabled: !!user,
  });

  const [busyTier, setBusyTier] = useState<string | null>(null);

  const subscribe = async (plan: PlanDef) => {
    setBusyTier(plan.tier);
    try {
      const returnUrl = Linking.createURL("/(app)/profile");
      const { url } = await createCheckoutSession(plan.tier, returnUrl);
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type !== "success" || !result.url) {
        if (result.type === "cancel" || result.type === "dismiss") toast.info("Checkout canceled — no charge was made.");
        return;
      }
      const parsed = Linking.parse(result.url);
      const sessionId = parsed.queryParams?.session_id;
      const canceled = parsed.queryParams?.canceled;
      if (canceled) { toast.info("Checkout canceled — no charge was made."); return; }
      if (typeof sessionId !== "string") return;
      const r = await confirmCheckout(sessionId);
      toast.success(`${capitalize(r.tier)} plan activated!`);
      qc.invalidateQueries({ queryKey: ["my-sub"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <Screen>
      <Header title="Profile" back icon={<Building2 size={22} color={colors.primary} />} subtitle="Your public profile and subscription plan." />

      {/* Company profile editor */}
      <Card padded>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent + "1A", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3">Company profile</Text>
            <Text variant="caption">Students see this in 'About the company' on each of your internships.</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Input label="COMPANY NAME" value={co.company_name} onChangeText={(t) => setCo({ ...co, company_name: t })} />
          <Input label="ABOUT" value={co.description} onChangeText={(t) => setCo({ ...co, description: t })} placeholder="What your company does, mission, culture…" multiline />
          <Input label="WEBSITE" value={co.website} onChangeText={(t) => setCo({ ...co, website: t })} placeholder="https://yourcompany.com" autoCapitalize="none" keyboardType="url" />
          <Input label="INDUSTRY" value={co.industry} onChangeText={(t) => setCo({ ...co, industry: t })} placeholder="Fintech" />
          <Input label="LOCATION" value={co.location} onChangeText={(t) => setCo({ ...co, location: t })} placeholder="Beirut, LB" />
          <Input label="TEAM SIZE" value={co.size} onChangeText={(t) => setCo({ ...co, size: t })} placeholder="11-50" />
          <Button title="Save company profile" size="sm" onPress={() => saveCompany.mutate()} loading={saveCompany.isPending} style={{ alignSelf: "flex-start" }} />
        </View>
      </Card>

      {/* Subscription plans */}
      <Card padded style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent + "1A", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3">Subscription plan</Text>
            <Text variant="caption">Secure checkout via Stripe. Test mode — use card 4242 4242 4242 4242, any future date & CVC.</Text>
          </View>
        </View>

        {current?.tier ? (
          <View style={{ marginBottom: spacing.md }}>
            <Badge label={`Active: ${capitalize(current.tier)} plan`} variant="success" icon={<Check size={12} color={colors.success} />} />
          </View>
        ) : null}

        <View style={{ gap: spacing.md }}>
          {plans.map((p, idx) => {
            const active = current?.tier === p.tier;
            const busy = busyTier !== null;
            const grad = colors[PLAN_GRADS[idx % PLAN_GRADS.length]];
            return (
              <Card key={p.tier} padded highlight={p.is_popular}>
                {p.is_popular ? <Text variant="caption" color="primary" weight="700">Most popular</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: p.is_popular ? spacing.sm : 0 }}>
                  <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: grad[0] }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">{p.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
                      <Text variant="title">{formatPrice(p.price_cents)}</Text>
                      <Text variant="muted" style={{ marginBottom: 3 }}>/mo</Text>
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  {p.features.map((f) => (
                    <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Check size={15} color={colors.accent} />
                      <Text variant="muted" style={{ flex: 1 }}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Button
                  title={active ? "Current plan" : busyTier === p.tier ? "Redirecting…" : "Subscribe"}
                  fullWidth
                  disabled={active || busy}
                  loading={busyTier === p.tier}
                  onPress={() => subscribe(p)}
                  style={{ marginTop: spacing.lg }}
                />
              </Card>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
