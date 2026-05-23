-- Class Monitoring App — PostgreSQL schema (Supabase)
-- *** RUN THIS FILE ONLY ONCE on a new empty database ***
-- If you get ERROR: type "app_role" already exists — your schema is already applied.
--   For Google auth only, run: PATCH_GOOGLE_AUTH_ONLY.sql
--   Do NOT run this whole file again.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'teacher',
  'monitor',
  'team_lead',
  'office',
  'admin'
);

create type public.monitor_status as enum ('On', 'Off');

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table public.teachers (
  index_no text primary key,
  teacher_fn text not null,
  designation text,
  teacher_sub text,
  tcr_address text,
  mobile_no text,
  grade text,
  role text default 'Teacher',
  photo_url text,
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teachers is 'Staff directory; auth via auth.users + profiles, not passwords here.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  teacher_index text unique references public.teachers (index_no) on delete set null,
  role public.app_role not null default 'teacher',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monitoring_team (
  id bigint generated always as identity primary key,
  teacher_index text not null references public.teachers (index_no) on delete cascade,
  monitor_day text not null,
  role text,
  status public.monitor_status not null default 'On',
  mon_comment text,
  unique (teacher_index)
);

create table public.routine (
  id bigint generated always as identity primary key,
  day text not null,
  period text not null,
  class text not null,
  subject text,
  teacher_index text references public.teachers (index_no) on delete set null
);

create index routine_day_period_idx on public.routine (day, period);
create index routine_teacher_idx on public.routine (teacher_index);

create table public.reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  report_time time not null default current_time,
  period text not null,
  class text not null,
  teacher_name text,
  attendance integer,
  monitor_report_text text,
  monitor_index text,
  submitted_by_index text,
  created_at timestamptz not null default now()
);

create index reports_date_period_class_idx on public.reports (report_date, period, class);
create index reports_date_idx on public.reports (report_date);

create table public.leaves (
  id bigint generated always as identity primary key,
  teacher_index text not null references public.teachers (index_no) on delete cascade,
  leave_start date not null,
  leave_end date not null,
  leave_type text,
  comment text,
  created_at timestamptz not null default now()
);

create index leaves_teacher_dates_idx on public.leaves (teacher_index, leave_start, leave_end);
create index leaves_active_idx on public.leaves (leave_start, leave_end);

create table public.duty_history (
  id bigint generated always as identity primary key,
  year integer not null,
  week_number integer not null,
  teacher_index text not null references public.teachers (index_no) on delete cascade,
  duty_type text not null check (duty_type in ('Single', 'Double', 'None')),
  unique (year, week_number, teacher_index)
);

create table public.temporary_duties (
  id bigint generated always as identity primary key,
  duty_date date not null,
  period text not null,
  teacher_index text not null references public.teachers (index_no) on delete cascade,
  unique (duty_date, period)
);

create table public.duty_roster_daily (
  duty_date date not null,
  period text not null,
  teacher_index text not null references public.teachers (index_no) on delete cascade,
  teacher_name text not null,
  primary key (duty_date, period)
);

create table public.special_messages (
  message_key text primary key,
  message_value text not null default ''
);

create table public.saved_messages (
  id bigint generated always as identity primary key,
  message_text text not null,
  created_at timestamptz not null default now()
);

create table public.students (
  id bigint generated always as identity primary key,
  roll text not null,
  name text not null,
  gender text,
  class text not null,
  unique (class, roll)
);

create index students_class_idx on public.students (class);

create table public.student_monthly_attendance (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  days_present integer not null default 0,
  comment text,
  unique (student_id, year, month)
);

-- App config: class structure (replaces hardcoded JS object)
create table public.app_config (
  key text primary key,
  value jsonb not null
);

insert into public.app_config (key, value) values
  ('class_structure', '{
    "à¦à¦¬à¦¤à§‡à¦¦à¦¾à¦¯à¦¼à¦¿": ["à§§à¦® à¦¶à§à¦°à§‡à¦£à¦¿", "à§¨à¦¯à¦¼ à¦¶à§à¦°à§‡à¦£à¦¿", "à§©à¦¯à¦¼ à¦¶à§à¦°à§‡à¦£à¦¿", "à§ªà¦°à§à¦¥ à¦¶à§à¦°à§‡à¦£à¦¿", "à§«à¦® à¦¶à§à¦°à§‡à¦£à¦¿"],
    "à¦¦à¦¾à¦–à¦¿à¦²": ["à§¬à¦·à§à¦  à¦¶à§à¦°à§‡à¦£à¦¿", "à§­à¦® à¦¶à§à¦°à§‡à¦£à¦¿", "à§®à¦® à¦¶à§à¦°à§‡à¦£à¦¿", "à§¯à¦® à¦¶à§à¦°à§‡à¦£à¦¿", "à§§à§¦à¦® à¦¶à§à¦°à§‡à¦£à¦¿"],
    "à¦†à¦²à¦¿à¦®": ["à¦†à¦²à¦¿à¦® à§§à¦® à¦¬à¦°à§à¦·", "à¦†à¦²à¦¿à¦® à§¨à¦¯à¦¼ à¦¬à¦°à§à¦·"],
    "à¦«à¦¾à¦¯à¦¿à¦²": ["à¦«à¦¾à¦¯à¦¿à¦² à§§à¦® à¦¬à¦°à§à¦·", "à¦«à¦¾à¦¯à¦¿à¦² à§¨à¦¯à¦¼ à¦¬à¦°à§à¦·", "à¦«à¦¾à¦¯à¦¿à¦² à§©à¦¯à¦¼ à¦¬à¦°à§à¦·"]
  }'::jsonb),
  ('teaching_periods', '["à§§à¦® à¦˜à¦£à§à¦Ÿà¦¾", "à§¨à¦¯à¦¼ à¦˜à¦£à§à¦Ÿà¦¾", "à§©à¦¯à¦¼ à¦˜à¦£à§à¦Ÿà¦¾", "à§ªà¦°à§à¦¥ à¦˜à¦£à§à¦Ÿà¦¾", "à§«à¦® à¦˜à¦£à§à¦Ÿà¦¾", "à§¬à¦·à§à¦  à¦˜à¦£à§à¦Ÿà¦¾", "à§­à¦® à¦˜à¦£à§à¦Ÿà¦¾", "à§®à¦® à¦˜à¦£à§à¦Ÿà¦¾"]'::jsonb),
  ('work_days_bn', '["à¦°à¦¬à¦¿à¦¬à¦¾à¦°", "à¦¸à§‹à¦®à¦¬à¦¾à¦°", "à¦®à¦™à§à¦—à¦²à¦¬à¦¾à¦°", "à¦¬à§à¦§à¦¬à¦¾à¦°", "à¦¬à§ƒà¦¹à¦¸à§à¦ªà¦¤à¦¿à¦¬à¦¾à¦°"]'::jsonb);

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teachers_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on signup (admin links teacher_index later)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'teacher')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: Bengali day name (Asia/Dhaka)
-- ---------------------------------------------------------------------------
create or replace function public.bengali_day_name(p_date date default current_date)
returns text
language sql
stable
as $$
  select (array[
    'à¦°à¦¬à¦¿à¦¬à¦¾à¦°', 'à¦¸à§‹à¦®à¦¬à¦¾à¦°', 'à¦®à¦™à§à¦—à¦²à¦¬à¦¾à¦°', 'à¦¬à§à¦§à¦¬à¦¾à¦°',
    'à¦¬à§ƒà¦¹à¦¸à§à¦ªà¦¤à¦¿à¦¬à¦¾à¦°', 'à¦¶à§à¦•à§à¦°à¦¬à¦¾à¦°', 'à¦¶à¦¨à¦¿à¦¬à¦¾à¦°'
  ])[extract(dow from (p_date::timestamp at time zone 'Asia/Dhaka'))::int + 1];
$$;

-- Weekly class count per teacher (replaces PHP get_all_teachers_with_class_counts)
create or replace function public.teachers_with_weekly_class_counts()
returns table (
  index_no text,
  teacher_fn text,
  designation text,
  teacher_sub text,
  tcr_address text,
  mobile_no text,
  grade text,
  role text,
  photo_url text,
  weekly_class_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.index_no,
    t.teacher_fn,
    t.designation,
    t.teacher_sub,
    t.tcr_address,
    t.mobile_no,
    t.grade,
    t.role,
    t.photo_url,
    coalesce(rc.cnt, 0) as weekly_class_count
  from public.teachers t
  left join (
    select teacher_index, count(*)::bigint as cnt
    from public.routine
    where subject is not null and trim(subject) <> '' and teacher_index is not null
    group by teacher_index
  ) rc on rc.teacher_index = t.index_no;
$$;

grant execute on function public.teachers_with_weekly_class_counts() to authenticated;
-- Row Level Security â€” Class Monitoring App

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
-- teachers (no password column â€” safe for clients)
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
-- RPC: monitoring dashboard bundle (replaces get_all_data PHP)

create or replace function public.get_monitoring_dashboard(p_date date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day_bn text;
  v_routine jsonb;
  v_teachers jsonb;
  v_on_leave jsonb;
  v_team jsonb;
  v_reports jsonb;
  v_filtered jsonb;
  v_special jsonb;
  v_roster jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_day_bn := public.bengali_day_name(p_date);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'Period', r.period,
      'Class', r.class,
      'Sub', r.subject,
      'TeacherFN', t.teacher_fn
    )
  ), '[]'::jsonb)
  into v_routine
  from public.routine r
  left join public.teachers t on t.index_no = r.teacher_index
  where r.day = v_day_bn;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'IndexNo', tw.index_no,
      'TeacherFN', tw.teacher_fn,
      'Designation', tw.designation,
      'TeacherSub', tw.teacher_sub,
      'TcrAddress', tw.tcr_address,
      'MobileNo', tw.mobile_no,
      'Grade', tw.grade,
      'Role', tw.role,
      'PhotoUrl', tw.photo_url,
      'weeklyClassCount', tw.weekly_class_count
    )
  ), '[]'::jsonb)
  into v_teachers
  from public.teachers_with_weekly_class_counts() tw;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'LeaveStart', l.leave_start,
      'LeaveEnd', l.leave_end,
      'LeaveType', l.leave_type,
      'Comment', l.comment,
      'TeacherFN', t.teacher_fn,
      'Designation', t.designation,
      'Index', t.index_no
    )
  ), '[]'::jsonb)
  into v_on_leave
  from public.leaves l
  left join public.teachers t on t.index_no = l.teacher_index
  where p_date between l.leave_start and l.leave_end;

  select coalesce(jsonb_agg(to_jsonb(mt)), '[]'::jsonb)
  into v_team
  from public.monitoring_team mt;

  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  into v_reports
  from public.reports r
  where r.report_date = p_date;

  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  into v_filtered
  from public.reports r
  where r.report_date = p_date
    and r.monitor_report_text is not null
    and trim(r.monitor_report_text) <> ''
    and trim(r.monitor_report_text) <> 'à¦ à¦¿à¦• à¦†à¦›à§‡'
    and trim(r.monitor_report_text) <> 'N/A';

  select coalesce(jsonb_object_agg(message_key, message_value), '{}'::jsonb)
  into v_special
  from public.special_messages;

  select coalesce(
    jsonb_object_agg(
      dr.period,
      jsonb_build_object('name', dr.teacher_name, 'index', dr.teacher_index)
    ),
    '{}'::jsonb
  )
  into v_roster
  from public.duty_roster_daily dr
  where dr.duty_date = p_date;

  return jsonb_build_object(
    'allTeachers', v_teachers,
    'routine', v_routine,
    'onLeave', v_on_leave,
    'monitoringTeam', v_team,
    'monitoringReport', v_filtered,
    'todaysAttendance', v_reports,
    'specialMessages', v_special,
    'dutyRoster', v_roster,
    'meta', jsonb_build_object('date', p_date, 'dayBn', v_day_bn)
  );
end;
$$;

grant execute on function public.get_monitoring_dashboard(date) to authenticated;

-- Submit monitor attendance report
create or replace function public.submit_monitor_report(
  p_date date,
  p_period text,
  p_class text,
  p_teacher_name text,
  p_attendance integer,
  p_monitor_report text,
  p_monitor_index text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_monitoring_member() or public.is_office_or_admin()) then
    raise exception 'Insufficient permissions';
  end if;

  insert into public.reports (
    report_date, report_time, period, class, teacher_name,
    attendance, monitor_report_text, monitor_index, submitted_by_index
  ) values (
    p_date, current_time, p_period, p_class, p_teacher_name,
    p_attendance, p_monitor_report, p_monitor_index, p_monitor_index
  );

  return jsonb_build_object('status', 'success', 'message', 'Report submitted successfully.');
end;
$$;

grant execute on function public.submit_monitor_report(
  date, text, text, text, integer, text, text
) to authenticated;

-- Reassign duty (team lead or admin)
create or replace function public.reassign_duty(
  p_date date,
  p_period text,
  p_teacher_index text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.current_profile_role() not in ('team_lead', 'admin') then
    raise exception 'Only team lead or admin can reassign duty';
  end if;

  insert into public.temporary_duties (duty_date, period, teacher_index)
  values (p_date, p_period, p_teacher_index)
  on conflict (duty_date, period)
  do update set teacher_index = excluded.teacher_index;

  return jsonb_build_object('status', 'success', 'message', 'Duty reassigned successfully.');
end;
$$;

grant execute on function public.reassign_duty(date, text, text) to authenticated;
