-- Row Level Security — Class Monitoring App

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_teacher_index()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select teacher_index from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

create or replace function public.is_office_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('office', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false);
$$;

create or replace function public.is_monitoring_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.monitoring_team mt
    join public.profiles p on p.teacher_index = mt.teacher_index
    where p.id = auth.uid() and mt.status = 'On'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.monitoring_team enable row level security;
alter table public.routine enable row level security;
alter table public.reports enable row level security;
alter table public.leaves enable row level security;
alter table public.duty_history enable row level security;
alter table public.temporary_duties enable row level security;
alter table public.duty_roster_daily enable row level security;
alter table public.special_messages enable row level security;
alter table public.saved_messages enable row level security;
alter table public.students enable row level security;
alter table public.student_monthly_attendance enable row level security;
alter table public.app_config enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- teachers (no password column — safe for clients)
-- ---------------------------------------------------------------------------
create policy "teachers_select_authenticated"
  on public.teachers for select to authenticated
  using (public.is_staff());

create policy "teachers_admin_write"
  on public.teachers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- monitoring_team, routine, config
-- ---------------------------------------------------------------------------
create policy "monitoring_team_select"
  on public.monitoring_team for select to authenticated
  using (public.is_staff());

create policy "monitoring_team_admin_write"
  on public.monitoring_team for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "routine_select"
  on public.routine for select to authenticated
  using (public.is_staff());

create policy "routine_office_admin_write"
  on public.routine for all to authenticated
  using (public.is_office_or_admin())
  with check (public.is_office_or_admin());

create policy "app_config_select"
  on public.app_config for select to authenticated
  using (public.is_staff());

create policy "app_config_admin_write"
  on public.app_config for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create policy "reports_select_today"
  on public.reports for select to authenticated
  using (
    public.is_staff()
    and report_date >= current_date - interval '90 days'
  );

create policy "reports_insert_monitor"
  on public.reports for insert to authenticated
  with check (
    public.is_monitoring_member()
    or public.is_office_or_admin()
  );

create policy "reports_update_office"
  on public.reports for update to authenticated
  using (public.is_office_or_admin())
  with check (public.is_office_or_admin());

-- ---------------------------------------------------------------------------
-- leaves
-- ---------------------------------------------------------------------------
create policy "leaves_select"
  on public.leaves for select to authenticated
  using (public.is_staff());

create policy "leaves_insert_own_or_office"
  on public.leaves for insert to authenticated
  with check (
    teacher_index = public.current_teacher_index()
    or public.is_office_or_admin()
  );

create policy "leaves_admin_write"
  on public.leaves for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- duty tables
-- ---------------------------------------------------------------------------
create policy "duty_roster_daily_select"
  on public.duty_roster_daily for select to authenticated
  using (public.is_staff());

create policy "temporary_duties_select"
  on public.temporary_duties for select to authenticated
  using (public.is_staff());

create policy "temporary_duties_insert_lead_or_admin"
  on public.temporary_duties for insert to authenticated
  with check (
    public.current_profile_role() in ('team_lead', 'admin')
    or public.is_admin()
  );

create policy "duty_history_select"
  on public.duty_history for select to authenticated
  using (public.is_staff());

-- service role / edge functions write duty_roster_daily (no client insert policy)

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create policy "special_messages_select"
  on public.special_messages for select to authenticated
  using (public.is_staff());

create policy "special_messages_admin"
  on public.special_messages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "saved_messages_select"
  on public.saved_messages for select to authenticated
  using (public.is_staff());

create policy "saved_messages_admin"
  on public.saved_messages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create policy "students_select"
  on public.students for select to authenticated
  using (public.is_staff());

create policy "students_office_write"
  on public.students for all to authenticated
  using (public.is_office_or_admin())
  with check (public.is_office_or_admin());

create policy "student_monthly_attendance_select"
  on public.student_monthly_attendance for select to authenticated
  using (public.is_staff());

create policy "student_monthly_attendance_office_write"
  on public.student_monthly_attendance for all to authenticated
  using (public.is_office_or_admin())
  with check (public.is_office_or_admin());

-- ---------------------------------------------------------------------------
-- Realtime publication (reports + duty changes)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.temporary_duties;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.duty_roster_daily;
exception when duplicate_object then null;
end $$;
