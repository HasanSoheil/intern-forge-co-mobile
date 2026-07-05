-- Add the foreign keys that were missing from the public schema, so every
-- table is properly connected and the DB enforces referential integrity.
-- Rules chosen to keep app behavior identical to before:
--   * CASCADE on user-owned rows (deleting a user already implied these were
--     dead rows the UI could never reach — now they're cleaned up instead).
--   * CASCADE on messages.internship_id (the column is NOT NULL so SET NULL
--     is impossible; applications already cascade on internship delete, which
--     makes the thread unreachable — cascading the messages matches that).
--   * RESTRICT on subscriptions.tier -> plans (a plan with paying subscribers
--     cannot be deleted; the admin panels already toast this error).
--     ON UPDATE CASCADE so renaming a tier propagates to subscriptions.
-- Applied to project oyzdmkorlaecsodakptr on 2026-07-04.
-- Rollback: 2026-07-04-rollback-fks.sql

begin;

alter table public.companies
  add constraint companies_profile_fkey
  foreign key (id) references public.profiles(id) on delete cascade;

alter table public.admins
  add constraint admins_profile_fkey
  foreign key (id) references public.profiles(id) on delete cascade;

alter table public.user_roles
  add constraint user_roles_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

alter table public.messages
  add constraint messages_recipient_id_fkey
  foreign key (recipient_id) references public.profiles(id) on delete cascade;

alter table public.messages
  add constraint messages_internship_id_fkey
  foreign key (internship_id) references public.internships(id) on delete cascade;

alter table public.notifications
  add constraint notifications_recipient_id_fkey
  foreign key (recipient_id) references public.profiles(id) on delete cascade;

alter table public.subscriptions
  add constraint subscriptions_tier_fkey
  foreign key (tier) references public.plans(tier)
  on delete restrict on update cascade;

commit;

-- Tell PostgREST (Supabase's API layer) to pick up the new relationships.
notify pgrst, 'reload schema';
