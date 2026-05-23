-- Safe to re-run: only replaces functions (no CREATE TYPE / CREATE TABLE).
-- If you see "app_role already exists", do NOT re-run RUN_IN_SQL_EDITOR.sql —
-- run supabase/PATCH_GOOGLE_AUTH_ONLY.sql instead.

-- Improve profile row when signing up via Google (or any OAuth provider)
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

-- Optional: link Google email to existing teacher row (run after teachers are imported)
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
    -- If you add teachers.email column later, prefer matching on that field.
  end if;
  return new;
end;
$$;

-- Uncomment when teachers have an email column:
-- create trigger on_teacher_email_link
--   after insert on auth.users
--   for each row execute function public.link_teacher_by_email();
