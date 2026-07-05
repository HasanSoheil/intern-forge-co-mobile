-- Rollback for 2026-07-04-add-missing-fks.sql — removes only the constraints
-- that migration added. Dropping constraints never modifies data.

begin;

alter table public.companies     drop constraint if exists companies_profile_fkey;
alter table public.admins        drop constraint if exists admins_profile_fkey;
alter table public.user_roles    drop constraint if exists user_roles_profile_fkey;
alter table public.messages      drop constraint if exists messages_sender_id_fkey;
alter table public.messages      drop constraint if exists messages_recipient_id_fkey;
alter table public.messages      drop constraint if exists messages_internship_id_fkey;
alter table public.notifications drop constraint if exists notifications_recipient_id_fkey;
alter table public.subscriptions drop constraint if exists subscriptions_tier_fkey;

commit;

notify pgrst, 'reload schema';
