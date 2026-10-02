-- Run this script in Supabase SQL Editor.
-- It replaces policies for the application tables listed below.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
    );
$$;

do $$
declare
    policy_record record;
begin
    for policy_record in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
        and tablename = any (array[
            'admin_users',
            'applications',
            'gallery',
            'news',
            'announcements',
            'academic_calendar',
            'academic_achievements',
            'school_fees',
            'curriculum',
            'alumni'
        ])
    loop
        execute format(
            'drop policy if exists %I on %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    end loop;
end
$$;

alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.gallery enable row level security;
alter table public.news enable row level security;
alter table public.announcements enable row level security;
alter table public.academic_calendar enable row level security;
alter table public.academic_achievements enable row level security;
alter table public.school_fees enable row level security;
alter table public.curriculum enable row level security;
alter table public.alumni enable row level security;

create policy admin_users_read_own
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy applications_public_insert
on public.applications
for insert
to anon, authenticated
with check (true);

create policy applications_admin_read
on public.applications
for select
to authenticated
using (public.is_admin());

create policy applications_admin_update
on public.applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy applications_admin_delete
on public.applications
for delete
to authenticated
using (public.is_admin());

create policy gallery_public_read
on public.gallery
for select
to anon, authenticated
using (true);

create policy news_public_read
on public.news
for select
to anon, authenticated
using (true);

create policy announcements_public_read
on public.announcements
for select
to anon, authenticated
using (true);

create policy academic_calendar_public_read
on public.academic_calendar
for select
to anon, authenticated
using (true);

create policy academic_achievements_public_read
on public.academic_achievements
for select
to anon, authenticated
using (true);

create policy school_fees_public_read
on public.school_fees
for select
to anon, authenticated
using (true);

create policy curriculum_public_read
on public.curriculum
for select
to anon, authenticated
using (true);

create policy alumni_public_read
on public.alumni
for select
to anon, authenticated
using (true);

create policy gallery_admin_write
on public.gallery
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy news_admin_write
on public.news
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy announcements_admin_write
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy academic_calendar_admin_write
on public.academic_calendar
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy academic_achievements_admin_write
on public.academic_achievements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy school_fees_admin_write
on public.school_fees
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy curriculum_admin_write
on public.curriculum
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy alumni_admin_write
on public.alumni
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Make the gallery files publicly viewable, but admin-only to change.
drop policy if exists school_gallery_public_read on storage.objects;
drop policy if exists school_gallery_admin_write on storage.objects;

create policy school_gallery_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'school-gallery');

create policy school_gallery_admin_write
on storage.objects
for all
to authenticated
using (bucket_id = 'school-gallery' and public.is_admin())
with check (bucket_id = 'school-gallery' and public.is_admin());
