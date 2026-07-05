# InternForge / CrewLink — Project Report

**An AI-assisted, two-sided internship marketplace** — web application + native mobile app on a shared Supabase backend.

| | |
|---|---|
| Product name | CrewLink (brand) / InternForge (project) |
| Web app | `intern-forge-co` — TanStack Start (React 19, SSR) |
| Mobile app | `internforge-mobile` — Expo SDK 56 (React Native 0.85) |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS), project `oyzdmkorlaecsodakptr` |
| Report date | 2026-07-04 |

---

## 1. Executive summary

CrewLink matches **students** looking for internships with **companies** hiring interns. Its two differentiators:

1. **Deterministic match scoring** — every student↔internship pair gets a 0–100 score computed from skill overlap, role alignment, and profile strength. No black box: the same inputs always give the same score.
2. **AI-verified ability** — instead of trusting a CV, students prove skills by submitting GitHub repositories to coding challenges. A static analyzer inspects the repo (structure, commits, authenticity) and an LLM acts as an "AI recruiter," producing a category-scored evaluation report. Companies see applicants ranked by match score *and* verified challenge scores.

The platform is monetized on the company side through Stripe subscription plans that gate how many internships a company can post and how many invitations it can send.

Three roles exist: **student** (build profile, complete challenges, apply, chat), **company** (subscribe, post internships with challenges, review ranked applicants, invite matched students, hire), and **admin** (manage users, the fields/skills catalog, subscription plans, platform challenges, and view analytics).

---

## 2. System architecture

```
┌────────────────────┐        ┌────────────────────┐
│   Web (browser)    │        │  Mobile (iOS/And.) │
│  TanStack Start    │        │  Expo / React      │
│  React 19 + SSR    │        │  Native 0.85       │
│                    │        │                    │
│  UI: shadcn/ui     │        │  UI: custom glass- │
│      + Tailwind 4  │        │  morphic kit       │
│                    │        │                    │
│  Secrets stay on   │        │  Business logic    │
│  the SERVER        │        │  runs ON-DEVICE    │
│  (server functions)│        │  (bundled keys —   │
│                    │        │   FYP trade-off)   │
└─────────┬──────────┘        └─────────┬──────────┘
          │      supabase-js (RLS)      │
          ▼                             ▼
┌─────────────────────────────────────────────────┐
│           SUPABASE (shared backend)             │
│  PostgreSQL: 20 tables, FK-enforced, RLS        │
│  Auth: email+password, 6-digit OTP verification │
│  Triggers: provisioning, notifications, gating  │
│  Realtime: live chat (messages)                 │
└───────────────┬─────────────────────────────────┘
                │ external APIs
   ┌────────────┼──────────────┬───────────────┐
   ▼            ▼              ▼               ▼
 Stripe      GitHub REST    Groq (LLM)    Gemini/Lovable
 (billing)   (repo analysis) (primary AI)  (AI fallbacks)
```

Both clients speak directly to the same Supabase project. There is **no custom API server**: data rules are enforced in the database itself (Row Level Security policies + triggers), which is what makes a thin two-client architecture safe.

The single most important architectural difference between the clients:

- **Web**: privileged operations (AI grading, Stripe, admin/service-role actions) run in **TanStack server functions** — secret keys never reach the browser. A server middleware (`requireSupabaseAuth`) validates the caller's JWT before every privileged call.
- **Mobile**: the same logic was **ported to run on-device**, with secret keys injected at build time via Expo config. This is a deliberate, documented FYP/demo trade-off; the production path is to move these operations to Supabase Edge Functions (see §10).

---

## 3. Technology stacks

| Layer | Web | Mobile |
|---|---|---|
| Framework | TanStack Start 1.167 (React 19, SSR, server functions) | Expo SDK 56, React Native 0.85, React 19, React Compiler enabled |
| Routing | TanStack Router (file-based, `src/routes/`) | expo-router 56 (file-based, `src/app/`) |
| Data/state | TanStack Query 5 | TanStack Query 5 (same patterns) |
| Backend SDK | supabase-js 2 | supabase-js 2 + AsyncStorage session persistence |
| UI | shadcn/ui (46 components, ~30 Radix primitives), Tailwind CSS 4, framer-motion, recharts, sonner | Custom 19-component design system: glassmorphism (expo-blur), gradients (expo-linear-gradient), reanimated 4, lucide-react-native |
| Forms/validation | react-hook-form + Zod | Controlled inputs + custom UI kit |
| Payments | Stripe 22 (server-side SDK) | Stripe REST API + Checkout opened in browser |
| AI | Raw fetch to Groq / Gemini / Lovable (no SDK) | Same code, on-device |
| Build | Vite 7, TypeScript 5.8, ESLint 9, Bun | Expo config (`app.config.ts` → env `extra`), TypeScript 6 |

---

## 4. Features by role

### Student
- **Onboarding**: pick a field → pick ≥3 skills from the admin-managed catalog → GitHub username/university.
- **Home**: top-matched internships with animated match rings; search.
- **Internships**: full list ranked by match score; detail page; **apply** by pasting a GitHub repo URL (triggers challenge evaluation when the posting has one).
- **Challenges**: platform-wide challenges (recommended by field); submitting a passing repo adds the skill to the profile and raises "profile strength" (`progress_percentage`).
- **Applications / Invitations**: track statuses; applying from an invitation auto-accepts it.
- **Portfolio feed**: posts (update/project/achievement) with up to 10 images/videos each — this is what companies see on the profile.
- **Messaging**: realtime chat, unlocked only after an application is accepted.

### Company
- **Onboarding**: choose a subscription plan → Stripe Checkout → gated into the app only with an active subscription.
- **Post internships**: role, skills, details, optional coding challenge (required files/keywords, difficulty).
- **Applicants**: grouped by internship, ranked by match score + verified challenge score, with the full AI evaluation report per applicant; accept/reject.
- **Matched students**: rank the student pool against a chosen internship and send invitations (quota-limited by plan).
- **Interns**: accepted interns hub (message, GitHub links). Viewing a student profile logs a `profile_view` (student sees "a company viewed your profile," throttled 1/hour).

### Admin
- Dashboard with user/revenue stats and an MRR chart (web).
- Full CRUD over: users (delete, promote to admin), fields & skills catalog, subscription plans, platform challenges.

### Shared
- Notification center (DB triggers auto-create notifications for applications, status changes, invitations, matched internships, profile views — respecting per-user notification preferences).
- Settings: theme, password change, notification prefs, account deletion.

---

## 5. Database design

20 tables in the public schema, organized in five clusters (full column-level diagram: `docs/database-schema.png` / `.svg`; complete data dictionary with every column in **Appendix A**).

- **Identity (supertype/subtype pattern)**: `auth.users` → `profiles` (1-1 public mirror) → `students` / `companies` / `admins` (1-1 role extensions sharing the same PK) + `user_roles`. Role-agnostic features (messages, notifications, profile views) reference the supertype `profiles`, so one FK serves every role; role-specific features reference the subtypes.
- **Marketplace**: `companies` → `internships` → `applications` & `invitations` (both junctioning to `students`), `messages` (realtime chat keyed by participants + internship), `notifications`, `profile_views`.
- **Challenges**: `fields` → `skills` and `platform_challenges`; `internships` → `internship_challenges`; both challenge types collect `challenge_submissions` (exactly one of the two challenge FKs is set — an exclusive arc enforced at application level).
- **Billing**: `plans` (catalog, admin-editable) → `subscriptions` (per-company purchase records with Stripe IDs; quotas are copied at purchase time so plan edits never retroactively change what a subscriber bought; `RESTRICT` prevents deleting an in-use plan).
- **Portfolio feed**: `students` → `student_posts` → `student_media` (one post, many attachments).

**Integrity**: as of 2026-07-04 every relation is a real foreign key (8 constraints were added to complete the graph — migration + rollback in `scripts/db/`). Delete rules: `CASCADE` on user-owned data, `RESTRICT` on plan deletion. Verified with a live 17-check test (account deletion cascades, internship deletion cascades, plan deletion blocked, embedded queries unaffected).

**Deliberate denormalization**: `students.skills` and `internships.required_skills` are text arrays (not junction tables) so the matching algorithm can intersect them in one pass without joins; `fields`/`skills` serve as the pick-list catalog. `applications.match_score` and `subscriptions` quotas are snapshots by design.

**Database-side logic** (triggers/functions): `handle_new_user` provisions profile + role + role-row on signup; `can_message` gates chat inserts to accepted-application pairs; five `notify_*` triggers create notifications automatically; RLS policies restrict every table to the appropriate role and owner (admin tables gated by `has_role`).

---

## 6. Core business logic (shared verbatim between web and mobile)

### 6.1 Match scoring (`matching.ts`)
Pure and deterministic, 0–100:

| Weight | Component |
|---|---|
| 60% | Skill overlap — normalized set intersection of student skills vs required skills |
| 15% | Role alignment — Jaccard similarity of role keywords (subset boosts to ≥80) |
| 10% | Challenge progress (`progress_percentage`) |
| 10% | Profile completeness (skills breadth, progress, role known) |
| 5% | Experience alignment (neutral 50 when unknown) |

Tiers: ≥80 Excellent, ≥60 Strong, ≥40 Decent, <40 Low. Stipend never affects the score.

### 6.2 GitHub static analysis (`github.ts`)
Pure REST reads (no code execution): repo visibility, file tree, README quality (0–100), required files/keywords, framework/language/tests/CI/TypeScript/Docker detection, folder-structure score, commit history with **single-dump detection** (anti-plagiarism/authenticity signal), plus up to 12 representative code samples for the AI. Produces a deterministic baseline score.

### 6.3 AI challenge grading (`submissions.ts`)
1. Run the GitHub analysis.
2. Send analysis + code samples + challenge brief to an LLM with provider failover: **Groq (`llama-3.3-70b-versatile`) → Google Gemini (`gemini-2.5-flash`) → Lovable gateway**. The model must return strict JSON: overall score, six category scores (functionality, code quality, architecture, challenge relevance, authenticity, documentation), strengths/weaknesses/suggestions, red flags, and a recruiter summary.
3. **Final score = 25% GitHub baseline + 75% AI score.** Pass requires: public repo, final ≥50, challenge relevance ≥40. If all AI providers fail the submission stays `pending` (retryable) rather than being falsely failed.
4. Passing a platform challenge adds the skill to the student and recomputes profile strength.

### 6.4 Billing (`billing.ts`)
Plan prices/quotas are resolved from the `plans` table (never trusted from the client), a subscription-mode Stripe Checkout session is created, and on return the session is **verified** (paid + belongs to this company) before upserting `subscriptions` idempotently and deactivating older subs. Web includes an open-redirect guard on the return URL. Webhooks are noted as the production upgrade path.

---

## 7. Authentication & security

**Flow**: email + password signup with a role picker → `handle_new_user` trigger provisions all rows → **email verification step (added 2026-07-03)**: Supabase requires email confirmation; the mobile app shows a 6-digit OTP screen (`verify-email`) with paste/autofill support and a 60-second resend cooldown; `verifyOtp(type: "signup")` creates the session. Unverified users who try to sign in are auto-sent a fresh code and routed to the verify screen. Students then pass through onboarding (field/skills), companies through plan selection.

**Authorization**: role from `user_roles` drives navigation and screen gating on both clients; the database enforces the same rules independently via RLS, so a compromised client cannot read or write beyond its role.

**Security posture — the key web/mobile difference**:
- Web: secrets (service-role key, Stripe secret, AI keys, GitHub token) exist only server-side; privileged server functions re-verify the caller's JWT and role.
- Mobile: the same secrets are bundled into the app binary and the logic runs on-device. **This is acceptable for an FYP demo and explicitly documented in the code**, but is the #1 item to fix for production (move to Supabase Edge Functions, ship only the publishable key).

**Known email limitation**: the project currently uses Supabase's default email sender (2 emails/hour, link-style email). A one-shot script (`scripts/setup-email-smtp.ps1`) connects a free SMTP provider (e.g. Brevo), which unlocks the branded 6-digit-code email template and raises the send limit — pending a human account signup.

---

## 8. Web vs mobile comparison

| Aspect | Web | Mobile |
|---|---|---|
| Scale | 105 TS/TSX files, ~14,300 LOC, 26 routes | 88 TS/TSX files, ~10,800 LOC, 24 route files |
| Rendering | SSR + hydration | Native, New Architecture, React Compiler |
| Privileged ops | Server functions (secrets server-side) | On-device (bundled keys, FYP trade-off) |
| UI system | shadcn/ui + Tailwind (46 components) | Custom dark-first glassmorphic kit (19 components, full light/dark token palettes) |
| Navigation | Sidebar layout | Role-adaptive bottom tab bar (5 slots remap per role) + stacks |
| Feature parity | Baseline | Full parity (all student/company/admin flows) + native touches (animated splash, match rings, blur tab bar) |
| Extra on web | Leaderboard page, MRR analytics charts | — |
| Backend artifacts | 28 SQL migrations + demo seed | FK-hardening migration + rollback (`scripts/db/`), SMTP setup script |

Shared: the same Supabase project, the same `Database` generated types, and line-for-line ports of `matching.ts`, `github.ts`, `submissions`, `billing`, and `catalog` — guaranteeing a student sees the identical match score on both platforms.

---

## 9. Recent engineering changelog (July 2026)

- **Email OTP verification** (2026-07-03): Supabase now requires email confirmation; 6-digit codes (1h expiry); new mobile `verify-email` screen; unverified sign-in recovery; live-tested end-to-end. *Note: web signup will also require verification now and should adopt the same handling.*
- **Referential integrity hardening** (2026-07-04): 8 FK constraints added so the entire public schema is FK-connected; delete rules chosen to preserve existing app behavior; verified with live cascade tests; rollback script saved.
- **Dead code removal**: unused `StudentMediaGallery` component deleted from the web app (superseded by the post-based portfolio feed).
- **Documentation**: full-schema ER diagram generated from the live database (`docs/database-schema.png/svg`).

---

## 10. Known limitations & future work

1. **Move secrets off the mobile client** → Supabase Edge Functions for AI grading, Stripe, and admin operations; ship only the publishable key. (Highest priority for production.)
2. **Custom SMTP** (10-minute Brevo setup) → unlocks the branded 6-digit verification email and removes the 2-emails/hour cap. Script is ready.
3. **Stripe webhooks** → replace verify-on-return with webhook-driven subscription lifecycle (renewals, cancellations, failed payments).
4. **Skills as junction tables** (`student_skills`, `internship_skills`) → would give catalog-enforced skill integrity at the cost of more complex matching queries; currently denormalized text arrays by design (one out-of-catalog skill string exists in demo data).
5. **`CHECK` constraint** on `challenge_submissions` to formalize the either-platform-or-internship-challenge rule (data already complies).
6. **Consolidate `admins` into `user_roles`** — the same fact is stored twice today (kept for now to avoid touching the signup trigger before the deadline).
7. **Web email-verification UI** — port the mobile OTP screen to the web app so both clients handle the now-required confirmation step natively.

---

## 11. At a glance

- **~25,000 lines** of TypeScript/TSX across the two clients.
- **20 database tables**, fully FK-connected, protected by RLS + 10+ triggers/functions.
- **3 roles**, ~30 user-facing screens per client, full feature parity.
- **4 external integrations**: Stripe, GitHub REST, Groq, Gemini (+ Lovable fallback).
- **Deterministic matching + AI-verified skills** as the core product thesis.

---

## Appendix A — Data dictionary (all tables & columns)

Conventions: **PK** = primary key · **FK →** = foreign key and its target · `text[]` = PostgreSQL array. All `id` PKs are UUIDs unless noted. Enum types are listed in A.6.

### A.1 Identity

**profiles** — one row per account; public 1-1 mirror of `auth.users`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → auth.users (CASCADE) |
| email | text | copy of auth email |
| full_name | text | |
| avatar_url | text | |
| notif_in_app | boolean | notification preference |
| notif_email | boolean | notification preference |
| created_at / updated_at | timestamptz | |

**students** — 1-1 extension of `profiles` for the student role

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → profiles (CASCADE) |
| desired_role | text | free-text job title |
| bio | text | |
| skills | text[] | chosen skill names (denormalized from catalog) |
| field | text | chosen field id (matches `fields.id` by convention) |
| github_username | text | |
| university | text | |
| location | text | |
| portfolio_url | text | |
| avatar_url | text | |
| demo_links | text[] | |
| projects | jsonb | portfolio projects |
| progress_percentage | integer | "profile strength" (0–100) |
| challenges_completed | integer | distinct validated platform challenges |
| created_at / updated_at | timestamptz | |

**companies** — 1-1 extension of `profiles` for the company role

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → profiles (CASCADE) |
| company_name | text | |
| industry | text | |
| website | text | |
| description | text | |
| logo_url | text | |
| location | text | |
| size | text | |
| created_at / updated_at | timestamptz | |

**admins** — 1-1 extension of `profiles` for the admin role

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → profiles (CASCADE) |
| created_at | timestamptz | |

**user_roles** — account → role mapping (drives navigation + RLS)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles (CASCADE) |
| role | app_role | student \| company \| admin |
| created_at | timestamptz | |

### A.2 Marketplace

**internships** — postings created by companies

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies (CASCADE) |
| title | text | |
| role | text | job title, free text |
| description | text | |
| required_skills | text[] | matched against `students.skills` |
| location | text | |
| remote | boolean | |
| duration_months | integer | |
| stipend | integer | never affects match score |
| status | internship_status | draft \| open \| closed |
| application_deadline | timestamptz | |
| created_at / updated_at | timestamptz | |

**applications** — student applied to an internship (unique per pair)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students (CASCADE) |
| internship_id | uuid | FK → internships (CASCADE) |
| status | application_status | pending \| reviewed \| accepted \| rejected |
| match_score | integer | snapshot of the computed score at apply time |
| created_at | timestamptz | |

**invitations** — company invited a student to an internship (unique per triple)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies (CASCADE) |
| student_id | uuid | FK → students (CASCADE) |
| internship_id | uuid | FK → internships (CASCADE) |
| message | text | |
| status | invitation_status | pending \| accepted \| declined |
| created_at | timestamptz | |

**messages** — realtime chat; inserts gated by `can_message()` (accepted application required)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| sender_id | uuid | FK → profiles (CASCADE) — any role |
| recipient_id | uuid | FK → profiles (CASCADE) |
| internship_id | uuid | NOT NULL, FK → internships (CASCADE) — thread context |
| content | text | |
| read | boolean | |
| created_at | timestamptz | |

**notifications** — auto-created by DB triggers

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| recipient_id | uuid | FK → profiles (CASCADE) |
| student_id | uuid | nullable, FK → profiles (SET NULL) — the student the event is about |
| internship_id | uuid | nullable reference (no FK) |
| type | text | e.g. application, invitation, profile_view |
| title | text | |
| message | text | |
| read | boolean | |
| created_at | timestamptz | |

**profile_views** — company viewed a student profile (unique viewer+viewed, throttled 1h)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| viewer_id | uuid | FK → profiles (CASCADE) |
| viewed_id | uuid | FK → profiles (CASCADE) |
| created_at | timestamptz | |

### A.3 Challenges

**fields** — admin-managed catalog of fields/domains

| Column | Type | Notes |
|---|---|---|
| id | text | PK (slug, e.g. `frontend`) |
| label | text | display name |
| sort_order | integer | |
| created_at | timestamptz | |

**skills** — admin-managed catalog, grouped by field (unique field+name)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| field_id | text | FK → fields (CASCADE) |
| name | text | |

**platform_challenges** — global challenges that raise profile strength

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| field | text | nullable, FK → fields (SET NULL) |
| title | text | |
| description | text | |
| skill | text | skill awarded on pass (by name) |
| category | text | free-text label |
| difficulty | challenge_difficulty | easy \| medium \| hard |
| required_files | text[] | checked by the GitHub analyzer |
| instructions | text | |
| points | integer | added to progress on pass |
| created_at | timestamptz | |

**internship_challenges** — per-posting coding challenge

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| internship_id | uuid | FK → internships (CASCADE) |
| title | text | |
| description | text | |
| category | text | |
| difficulty | challenge_difficulty | |
| required_files | text[] | |
| required_keywords | text[] | |
| instructions | text | |
| created_at | timestamptz | |

**challenge_submissions** — a student's graded GitHub submission (exactly one of the two challenge FKs is set)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students (CASCADE) |
| platform_challenge_id | uuid | nullable, FK → platform_challenges (CASCADE) |
| internship_challenge_id | uuid | nullable, FK → internship_challenges (CASCADE) |
| github_url | text | submitted repository |
| score | integer | 25% GitHub baseline + 75% AI score |
| status | submission_status | pending \| validated \| failed |
| report | jsonb | full AI evaluation (category scores, strengths, red flags…) |
| submitted_at | timestamptz | |

### A.4 Billing

**plans** — subscription catalog (admin-editable; shown on pricing page)

| Column | Type | Notes |
|---|---|---|
| tier | text | PK (e.g. `free`, `pro`) |
| name | text | display name |
| price_cents | integer | |
| posts_allowed | integer | quota |
| invitations_allowed | integer | quota |
| features | text[] | marketing bullet list |
| is_popular | boolean | "most popular" badge |
| active | boolean | |
| sort_order | integer | |
| created_at | timestamptz | |

**subscriptions** — a company's purchase record (unique stripe_subscription_id)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies (CASCADE) |
| tier | text | FK → plans (RESTRICT delete, CASCADE rename) |
| status | subscription_status | active \| inactive \| canceled |
| posts_allowed | integer | snapshot of plan quota at purchase |
| invitations_allowed | integer | snapshot of plan quota at purchase |
| stripe_customer_id | text | |
| stripe_subscription_id | text | idempotency key for checkout confirmation |
| started_at / expires_at | timestamptz | |
| created_at | timestamptz | |

### A.5 Portfolio feed

**student_posts** — feed entries on a student profile

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students (CASCADE) |
| kind | text | update \| project \| achievement |
| body | text | |
| link_url | text | demo/repo link |
| created_at | timestamptz | |

**student_media** — image/video attachments (up to 10 per post)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_id | uuid | FK → students (CASCADE) |
| post_id | uuid | FK → student_posts (CASCADE) |
| url | text | Supabase Storage path (signed URLs at read time) |
| media_type | text | image \| video |
| caption | text | |
| created_at | timestamptz | |

### A.6 Enum types

| Enum | Values |
|---|---|
| app_role | student · company · admin |
| internship_status | draft · open · closed |
| application_status | pending · reviewed · accepted · rejected |
| invitation_status | pending · accepted · declined |
| challenge_difficulty | easy · medium · hard |
| submission_status | pending · validated · failed |
| subscription_status | active · inactive · canceled |
