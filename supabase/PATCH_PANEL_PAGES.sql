-- Safe after main schema. Copy of 20250522100005_panel_pages_rpc.sql
-- Also promotes rahmmed2330756@bscse.uiu.ac.bd to admin.

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'rahmmed2330756@bscse.uiu.ac.bd'
  limit 1
);

insert into public.special_messages (message_key, message_value) values
  ('OfficeLetter', ''),
  ('fridayMessage', ''),
  ('saturdayMessage', ''),
  ('MssToTeachers', ''),
  ('LeaveMessage', ''),
  ('MonitorInstruction', '')
on conflict (message_key) do nothing;

create or replace function public.get_leave_card_summary(p_teacher_index text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher jsonb;
  v_leaves jsonb;
  v_monthly int := 0;
  v_yearly int := 0;
  r record;
  v_days int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_staff() then raise exception 'Insufficient permissions'; end if;
  select jsonb_build_object(
    'IndexNo', t.index_no, 'TeacherFN', t.teacher_fn, 'Designation', t.designation,
    'TeacherSub', t.teacher_sub, 'MobileNo', t.mobile_no
  ) into v_teacher from public.teachers t where t.index_no = p_teacher_index;
  if v_teacher is null then
    return jsonb_build_object('status', 'error', 'message', 'Teacher not found');
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object('LeaveStart', l.leave_start, 'LeaveEnd', l.leave_end,
      'LeaveType', l.leave_type, 'Comment', l.comment) order by l.leave_start desc
  ), '[]'::jsonb) into v_leaves from public.leaves l where l.teacher_index = p_teacher_index;
  for r in select leave_start, leave_end from public.leaves where teacher_index = p_teacher_index loop
    v_days := (r.leave_end - r.leave_start) + 1;
    if extract(year from r.leave_start) = extract(year from current_date) then v_yearly := v_yearly + v_days; end if;
    if extract(year from r.leave_start) = extract(year from current_date)
       and extract(month from r.leave_start) = extract(month from current_date) then
      v_monthly := v_monthly + v_days;
    end if;
  end loop;
  return jsonb_build_object('status', 'success', 'teacher', v_teacher, 'leaves', v_leaves,
    'monthlyLeaveDays', v_monthly, 'yearlyLeaveDays', v_yearly);
end;
$$;
grant execute on function public.get_leave_card_summary(text) to authenticated;

create or replace function public.upsert_monthly_attendance(p_year integer, p_month integer, p_class text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row jsonb; v_roll text; v_student_id bigint; v_present int; v_comment text; v_count int := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_office_or_admin() then raise exception 'Insufficient permissions'; end if;
  for row in select * from jsonb_array_elements(p_rows) loop
    v_roll := row->>'roll';
    if v_roll is null then continue; end if;
    select id into v_student_id from public.students where class = p_class and roll = v_roll limit 1;
    if v_student_id is null then continue; end if;
    v_present := coalesce((row->>'days_present')::int, (row->>'attendance')::int, 0);
    v_comment := nullif(trim(coalesce(row->>'comment', '')), '');
    insert into public.student_monthly_attendance (student_id, year, month, days_present, comment)
    values (v_student_id, p_year, p_month, v_present, v_comment)
    on conflict (student_id, year, month) do update set days_present = excluded.days_present, comment = excluded.comment;
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('status', 'success', 'message', v_count || ' জন শিক্ষার্থীর হাজিরা সংরক্ষিত হয়েছে।');
end;
$$;
grant execute on function public.upsert_monthly_attendance(integer, integer, text, jsonb) to authenticated;

create or replace function public.office_submit_leave(p_teacher_index text, p_start date, p_end date, p_leave_type text, p_comment text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_office_or_admin() then raise exception 'Insufficient permissions'; end if;
  insert into public.leaves (teacher_index, leave_start, leave_end, leave_type, comment)
  values (p_teacher_index, p_start, p_end, p_leave_type, coalesce(p_comment, ''));
  return jsonb_build_object('status', 'success', 'message', 'ছুটির তথ্য সংরক্ষিত হয়েছে।');
end;
$$;
grant execute on function public.office_submit_leave(text, date, date, text, text) to authenticated;

drop policy if exists "duty_roster_daily_admin_write" on public.duty_roster_daily;
create policy "duty_roster_daily_admin_write" on public.duty_roster_daily for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "temporary_duties_admin_write" on public.temporary_duties;
create policy "temporary_duties_admin_write" on public.temporary_duties for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
