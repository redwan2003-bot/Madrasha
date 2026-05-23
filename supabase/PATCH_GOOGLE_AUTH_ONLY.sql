-- Safe to run AFTER the main schema already exists.
-- Does NOT create types or tables — only updates signup functions for Google OAuth.
-- Run this in Supabase SQL Editor if you got: type "app_role" already exists
-- (that means you re-ran RUN_IN_SQL_EDITOR.sql by mistake).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_role public.app_role;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.app_role,
    'teacher'::public.app_role
  );

  insert into public.profiles (id, display_name, role)
  values (new.id, v_display_name, v_role);

  return new;
end;
$$;

create or replace function public.link_teacher_by_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null then
    update public.teachers t
    set user_id = new.id
    from public.profiles p
    where p.id = new.id
      and t.user_id is null
      and lower(t.mobile_no) = lower(new.email);
  end if;
  return new;
end;
$$;
