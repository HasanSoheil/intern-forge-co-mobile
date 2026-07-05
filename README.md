# CrewLink — Mobile App (Expo / React Native)

A full-featured mobile client for the **CrewLink** internship marketplace,
built with **Expo SDK 56** + **expo-router**. It is a complete feature-parity port
of the web app and runs on the **same Supabase backend** (same project & keys).

See [WEBSITE_OVERVIEW.md](./WEBSITE_OVERVIEW.md) for the full product/feature/spec
documentation (web app + backend + this mobile app).

## Stack
- Expo SDK 56, React Native 0.85 (New Architecture, React Compiler)
- expo-router (file-based routing, `src/app/`)
- Supabase JS (`@supabase/supabase-js`) with AsyncStorage session
- TanStack Query for data fetching/caching
- Custom futuristic dark-first design system (expo-linear-gradient, expo-blur,
  react-native-svg match rings, lucide-react-native icons)
- Stripe Checkout (opened via expo-web-browser), AI scoring (Groq→Gemini→Lovable),
  GitHub static analysis — all ported from the web app and run on-device.

## Setup
1. `npm install`
2. The backend keys live in `.env` (already populated; same as the website). They
   are injected into the app via `app.config.ts` → `extra` and read in
   `src/lib/env.ts`. `.env` is git-ignored.
3. Start: `npx expo start` → press `a` (Android), `i` (iOS), or scan the QR with
   Expo Go / a dev build.

> **Security note (FYP/demo):** secret keys (Supabase service role, Stripe secret,
> AI keys) are bundled into the app. On the web these run only server-side. For a
> production release, move AI scoring, Stripe, and admin/account-deletion to
> **Supabase Edge Functions** and ship the app with only the publishable key.

## Project structure
```
src/
  app/                       # expo-router routes (thin — delegate to features/)
    _layout.tsx              # providers + auth gate
    index.tsx                # public landing
    (auth)/                  # sign-in / sign-up
    onboarding.tsx           # student 3-step onboarding
    (app)/
      _layout.tsx            # student-onboarding gate + detail stack
      (tabs)/                # role-aware bottom tab bar (index/browse/discover/messages/more)
      internships/[id], challenges/[id], students/[id], messages/[threadId], …
  features/                  # screen implementations grouped by domain
  components/ui/             # design-system kit (Text, Button, Card, MatchRing, …)
  components/StudentFeed.tsx # portfolio feed (posts + media upload)
  context/auth-context.tsx   # session + role
  theme/                     # tokens + ThemeProvider (dark/light/system)
  lib/                       # supabase, env, matching, github, submissions, billing,
                             # catalog, account, utils
  integrations/supabase/types.ts  # generated DB types (shared with web)
```

## Feature parity
Students: home/top-matches, internships, internship detail + apply (GitHub repo →
AI score), platform challenges + AI report, applications, invitations, profile
(strength, stats, portfolio feed, profile views), notifications, messaging.
Companies: dashboard, post internship (+ coding challenge), applicants (ranked,
accept/reject), matched students + invite, sent invitations, interns, profile +
Stripe plan checkout, messaging. Admin: users / fields & skills / plans / platform
challenges management + stats. Shared: settings (theme, password, notif prefs,
delete account), realtime chat.
