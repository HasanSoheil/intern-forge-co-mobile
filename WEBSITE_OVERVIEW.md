# InternForge / MatchIntern — Complete Project Documentation

> This document describes the **existing web application** (located at
> `Desktop/Intern-match-fyp/intern-forge-co`) in full, and serves as the
> functional specification for the **React Native (Expo) mobile app** in this
> repository. The mobile app reuses the **same Supabase backend** and the same
> business logic (matching, GitHub analysis, AI scoring, Stripe billing).

---

## 1. What the product is

InternForge (UI brand name "MatchIntern") is a **two-sided internship
marketplace** that matches **students** with **companies** using a deterministic
skill/role match score, and verifies student ability through **coding challenges
graded by AI** (an AI "recruiter" reviews the candidate's GitHub repo).

There are **three roles**:

| Role | Purpose |
|------|---------|
| **Student** | Build a profile, complete platform challenges to raise "profile strength", browse/apply to internships (submitting a GitHub repo for the internship's coding challenge), receive invitations, message companies. |
| **Company** | Subscribe to a plan (Stripe), post internships with optional coding challenges, see ranked applicants, invite top-matched students, accept/reject, message accepted interns. |
| **Admin** | Manage users, fields & skills catalog, subscription plans, and platform challenges; view revenue/MRR analytics. |

---

## 2. Tech stack

### Web (existing)
- **Framework**: TanStack Start (React 19 metaframework, SSR + server functions)
- **Routing**: TanStack Router (file-based, `src/routes/`)
- **Data**: TanStack Query (caching/mutations)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **UI**: shadcn/ui (Radix) + Tailwind v4, Lucide icons, Sonner toasts, Framer Motion
- **Payments**: Stripe (test mode)
- **AI scoring**: Groq → Gemini → Lovable gateway (failover)
- **Static analysis**: GitHub REST API

### Mobile (this repo)
- **Framework**: Expo SDK 56 (React Native 0.85, New Architecture, React Compiler)
- **Routing**: expo-router (file-based, `src/app/`) — mirrors the web routes
- **Data**: TanStack Query (same patterns as web)
- **Backend**: identical Supabase project (`@supabase/supabase-js` + AsyncStorage session)
- **UI**: custom futuristic design system (dark-first, glassmorphism via expo-blur,
  gradients via expo-linear-gradient, animations via reanimated), lucide-react-native
- **Payments**: Stripe Checkout opened via expo-web-browser
- **AI scoring / GitHub analysis**: ported verbatim, run on-device (keys injected via Expo config `extra`)

---

## 3. Backend — environment & keys

All keys live in the web project's `.env` and are reused by mobile (via
`app.config.ts` → `extra`, sourced from a local `.env`). **Security note:** on
web these secret keys (service role, Stripe secret, AI keys) run only on the
server. On mobile they are bundled into the app — acceptable for an FYP/demo, but
for production these operations should move to **Supabase Edge Functions**.

| Key | Used for |
|-----|----------|
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Supabase client (RLS-protected reads/writes) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin ops & account deletion (bypasses RLS) |
| `GROQ_API_KEY` (`GROQ_MODEL`) | AI scoring — preferred (free, ~1000+/day, `llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` (`GEMINI_MODEL`) | AI scoring fallback (`gemini-2.5-flash`, ~20/day free) |
| `LOVABLE_API_KEY` | AI scoring last-resort gateway |
| `GITHUB_TOKEN` | GitHub static analysis (raises rate limit 60→5000/hr) |
| `STRIPE_SECRET_KEY` | Create/confirm Stripe Checkout sessions (test mode) |

Supabase project id: `oyzdmkorlaecsodakptr`.

---

## 4. Database schema (Supabase / PostgreSQL)

### Enums
- `app_role`: `student | company | admin`
- `subscription_status`: `active | inactive | canceled`
- `internship_status`: `draft | open | closed`
- `application_status`: `pending | reviewed | accepted | rejected`
- `invitation_status`: `pending | accepted | declined`
- `challenge_difficulty`: `easy | medium | hard`
- `submission_status`: `pending | validated | failed`

### Tables (key columns)
- **profiles** `id(=auth.uid)`, `email`, `full_name`, `avatar_url`, `notif_in_app`, `notif_email`
- **user_roles** `user_id`, `role(app_role)` — created by `handle_new_user` trigger
- **students** `id`, `desired_role`, `bio`, `skills[]`, `field`, `github_username`, `university`, `location`, `portfolio_url`, `avatar_url`, `progress_percentage`, `challenges_completed`, `projects(jsonb)`, `demo_links[]`
- **companies** `id`, `company_name`, `industry`, `website`, `description`, `logo_url`, `location`, `size`
- **admins** `id`
- **internships** `id`, `company_id`, `title`, `role`, `description`, `required_skills[]`, `location`, `remote`, `duration_months`, `stipend`, `status`, `application_deadline`
- **internship_challenges** `id`, `internship_id`, `title`, `description`, `category`, `required_files[]`, `required_keywords[]`, `instructions`, `difficulty`
- **platform_challenges** `id`, `title`, `description`, `skill`, `field`, `difficulty`, `category`, `required_files[]`, `instructions`, `points`
- **applications** `id`, `student_id`, `internship_id`, `status`, `match_score` — unique(student, internship)
- **challenge_submissions** `id`, `student_id`, `platform_challenge_id?`, `internship_challenge_id?`, `github_url`, `score`, `status`, `report(jsonb)`, `submitted_at`
- **invitations** `id`, `company_id`, `student_id`, `internship_id`, `message`, `status` — unique(company, student, internship)
- **messages** `id`, `sender_id`, `recipient_id`, `internship_id`, `content`, `read` — Realtime enabled
- **notifications** `id`, `recipient_id`, `type`, `title`, `message`, `internship_id?`, `student_id?`, `read`
- **profile_views** `id`, `viewer_id`, `viewed_id` — unique(viewer, viewed)
- **student_posts** `id`, `student_id`, `kind(update|project|achievement)`, `body`, `link_url`
- **student_media** `id`, `student_id`, `url`, `media_type(image|video)`, `post_id?`, `caption`
- **subscriptions** `id`, `company_id`, `tier`, `status`, `posts_allowed`, `invitations_allowed`, `expires_at`, `stripe_customer_id`, `stripe_subscription_id` — unique(stripe_subscription_id)
- **plans** `tier(PK)`, `name`, `price_cents`, `posts_allowed`, `invitations_allowed`, `features[]`, `is_popular`, `active`, `sort_order`
- **fields** `id(PK,text)`, `label`, `sort_order`
- **skills** `id`, `field_id`, `name` — unique(field_id, name)

### Database functions / triggers
- `handle_new_user()` — on signup, creates `profiles` + `user_roles` + the role-specific row (student/company/admin) from `auth.users.user_metadata.role`.
- `has_role(uid, role)` — RLS helper.
- `can_message(a, b, internship)` — true only if an **accepted** application links the two users; gates `messages` inserts.
- `notify_on_application`, `notify_on_application_status`, `notify_on_invitation`, `notify_matched_students_on_internship`, `notify_on_profile_view` (company viewers, throttled 1h) — auto-create `notifications` (respect `notif_in_app`).
- `on_internship_challenge_submission` — marks the related application `reviewed`.
- `mark_invitation_on_application` — auto-accepts a pending invitation when the student applies.

### RLS summary
Everyone authenticated can read profiles/students/companies/open internships/catalog. Users can only write their own rows. Companies manage their own internships/challenges/invitations and see applicants to their internships. Students see/write their own applications/submissions. Messages restricted to the two participants of an accepted application. Admin-only tables gated by `has_role(uid,'admin')`.

---

## 5. Business logic (ported verbatim to mobile)

### Match score — `lib/matching.ts`
Pure, deterministic, order-independent. `calculateMatchScore` returns 0–100:
- **60%** skill overlap (% of required skills the student has, normalized)
- **15%** role alignment (Jaccard of role keywords; ≥80 if one is a subset of the other)
- **10%** challenge progress (`progress_percentage`)
- **10%** profile completeness (auto-derived: skills breadth, progress, role known)
- **5%** experience alignment (neutral 50 when unknown)

Tiers: ≥80 Excellent · ≥60 Strong · ≥40 Decent · <40 Low. **Stipend never affects score.**

### GitHub analysis — `lib/github.ts`
Pure REST reads (no execution). Extracts: visibility, file tree, README + quality
(0–100), required files/keywords found, framework/language/package-manager/tests/CI/
linter/TypeScript/Docker detection, folder structure + separation-of-concerns (0–100),
commit history + **single-dump detection** (authenticity), and up to 12 representative
code samples. Deterministic baseline score = `files*0.35 + readme*0.2 + keywords*0.2 +
structure*0.15 + (public?10:0)`. This is **25%** of the final grade.

### AI scoring — `lib/submissions.ts` (`submitChallenge`)
1. Run GitHub analysis.
2. Send analysis + code samples + brief to AI (Groq → Gemini → Lovable) which returns
   strict JSON: `overallScore`, `categoryScores{functionality, codeQuality, architecture,
   challengeRelevance, authenticity, documentation}`, `strengths/weaknesses/suggestions`,
   `recruiterSummary`, `redFlags`.
3. `finalScore = github*0.25 + ai.overallScore*0.75`.
4. **Pass** if `public && finalScore≥50 && challengeRelevance≥40` → status `validated`;
   if AI unavailable → `pending` (retry); else `failed`.
5. On a passed **platform** challenge: add the skill, recount distinct validated
   challenges, set `progress_percentage = min(100, completed*10 + points)`.

### Billing — `lib/billing.ts`
- `createCheckoutSession(tier)` → reads plan, creates Stripe subscription Checkout session, returns URL (opened in browser on mobile).
- `confirmCheckout(sessionId)` → verifies `paid` + ownership, upserts `subscriptions` (idempotent on `stripe_subscription_id`), deactivates other active subs.

### Catalog — `lib/catalog.ts`
`useFields()` (fields + grouped skills) and `usePlans()` (active plans), 5-min cache.

### Admin / account — `lib/admin.ts`, `lib/account.ts`
`adminDeleteUser`, `adminCreateAdmin`, `deleteMyAccount` (service-role auth admin API).

---

## 6. Screens / routes (full feature parity list)

### Public & auth
| Web route | Mobile route | Purpose |
|-----------|--------------|---------|
| `/` | `(public)/index` | Marketing landing (hero, for-students/for-companies, pricing, categories) |
| `/auth` | `(auth)/sign-in`, `(auth)/sign-up` | Sign in / sign up with role selector (student/company) |
| `/onboarding` | `onboarding` | Students only: 3 steps — pick field → pick ≥3 skills → GitHub/university |

### Student
| Web route | Purpose |
|-----------|---------|
| `/app` (student) | Home: top matches + more opportunities, search, "Applied" badges |
| `/app/internships` | All open internships ranked by match score |
| `/app/internships/:id` | Detail + apply with GitHub repo (runs challenge eval) |
| `/app/challenges` | Platform challenges (recommended vs all), completion/score badges |
| `/app/challenges/:id` | Submit GitHub repo → full AI report (categories, strengths, etc.) |
| `/app/applications` | My applications with status + challenge submission status |
| `/app/invitations` | Received invitations (view / decline) |
| `/app/profile` | Profile + strength %, stats, bio/portfolio edit, recent profile views, portfolio feed |

### Company
| Web route | Purpose |
|-----------|---------|
| `/app` (company) | Dashboard: stats, subscription gate, your internships |
| `/app/post` | Post internship (field, skills, details, optional coding challenge) |
| `/app/applicants` | Applicants grouped by internship, ranked by match+challenge, accept/reject |
| `/app/matched-students` | Rank students vs a selected internship, invite them |
| `/app/sent-invitations` | History of invitations (tabs by status) |
| `/app/interns` | Accepted interns (message / GitHub) |
| `/app/students/:id` | View a student's full profile + portfolio (logs a profile_view) |

### Shared
| Web route | Purpose |
|-----------|---------|
| `/app/messages` + `/:threadId` | Realtime chat (only with accepted-application counterparties) |
| `/app/notifications` | Notification center (deep-links to the relevant screen) |
| `/app/settings` | Theme, password change, notification prefs, delete account |
| `/app/profile` (company) | Company profile + plan selection / Stripe checkout |

### Admin
| Web route | Purpose |
|-----------|---------|
| `/app/admin` | Stats + MRR chart; tabs: Users / Fields & Skills / Plans / Platform Challenges (full CRUD) |

### Navigation (sidebar → mobile tab/drawer)
- **Student**: Home · Challenges · Internships · Applications · Invitations · Notifications · Messages · Profile · Settings
- **Company**: Dashboard · Post · Matched students · Invitations (sent) · Applicants · Interns · Notifications · Messages · Profile · Settings
- **Admin**: Admin · Settings

---

## 7. Key flows

1. **Signup → role**: `auth.signUp` with `user_metadata.role` → trigger provisions rows → students go to onboarding, companies/admins to app.
2. **Apply**: student opens internship → pastes GitHub URL → `submitChallenge` (if challenge exists) → insert `application` with `match_score` → company notified.
3. **Score a challenge**: GitHub analysis (25%) + AI review (75%) → report stored on `challenge_submissions`; platform pass raises profile strength.
4. **Hire**: company ranks applicants → Accept → student notified → an accepted application unlocks **messaging** between the two.
5. **Invite**: company ranks students vs an internship → Invite → student notified; applying from an invite auto-accepts it.
6. **Subscribe**: company picks a plan → Stripe Checkout (browser) → confirm → `subscriptions` active → can post internships.

---

## 8. Mobile design language

Futuristic, modern, **dark-first** with the brand green (`oklch(0.68 0.18 148)` → vivid
emerald), glassmorphic cards (blur), subtle gradients and glows, large rounded radii,
animated match rings and progress bars, spring transitions (reanimated), and a bottom
tab bar + stack navigation. Light mode supported. The aim is full **functional parity**
with the web app under a more immersive mobile-native UI.
