-- Class Monitoring App — PostgreSQL schema (Supabase)
-- Migrated from legacy MySQL tables; no plaintext passwords.

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
    "এবতেদায়ি": ["১ম শ্রেণি", "২য় শ্রেণি", "৩য় শ্রেণি", "৪র্থ শ্রেণি", "৫ম শ্রেণি"],
    "দাখিল": ["৬ষ্ঠ শ্রেণি", "৭ম শ্রেণি", "৮ম শ্রেণি", "৯ম শ্রেণি", "১০ম শ্রেণি"],
    "আলিম": ["আলিম ১ম বর্ষ", "আলিম ২য় বর্ষ"],
    "ফাযিল": ["ফাযিল ১ম বর্ষ", "ফাযিল ২য় বর্ষ", "ফাযিল ৩য় বর্ষ"]
  }'::jsonb),
  ('teaching_periods', '["১ম ঘণ্টা", "২য় ঘণ্টা", "৩য় ঘণ্টা", "৪র্থ ঘণ্টা", "৫ম ঘণ্টা", "৬ষ্ঠ ঘণ্টা", "৭ম ঘণ্টা", "৮ম ঘণ্টা"]'::jsonb),
  ('work_days_bn', '["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার"]'::jsonb);

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
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার',
    'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
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
