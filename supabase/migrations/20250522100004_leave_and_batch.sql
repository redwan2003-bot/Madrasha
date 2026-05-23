-- Leave submit + batch monitor reports

create or replace function public.submit_leave_request(
  p_start date,
  p_end date,
  p_leave_type text,
  p_comment text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_index text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select teacher_index into v_index from public.profiles where id = auth.uid();
  if v_index is null then
    raise exception 'Teacher profile not linked';
  end if;

  insert into public.leaves (teacher_index, leave_start, leave_end, leave_type, comment)
  values (v_index, p_start, p_end, p_leave_type, coalesce(p_comment, ''));

  return jsonb_build_object('status', 'success', 'message', 'Leave request submitted successfully.');
end;
$$;

grant execute on function public.submit_leave_request(date, date, text, text) to authenticated;

create or replace function public.batch_submit_monitor_reports(p_reports jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_count int := 0;
  v_monitor_index text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_monitoring_member() or public.is_office_or_admin()) then
    raise exception 'Insufficient permissions';
  end if;

  for r in select * from jsonb_array_elements(p_reports)
  loop
    v_monitor_index := coalesce(r->>'monitorIndex', r->>'monitor_index', 'N/A');
    insert into public.reports (
      report_date,
      report_time,
      period,
      class,
      teacher_name,
      attendance,
      monitor_report_text,
      monitor_index,
      submitted_by_index
    ) values (
      coalesce((r->>'Date')::date, current_date),
      coalesce((r->>'Time')::time, current_time),
      coalesce(r->>'Period', 'N/A'),
      coalesce(r->>'Class', ''),
      coalesce(r->>'TeacherName', r->>'TeacherName', ''),
      coalesce((r->>'NumberOfAttend')::int, 0),
      coalesce(r->>'monitorReport', r->>'monitor_report', 'N/A'),
      v_monitor_index,
      v_monitor_index
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'status', 'success',
    'message', v_count || 'টি রিপোর্ট সফলভাবে জমা হয়েছে।'
  );
end;
$$;

grant execute on function public.batch_submit_monitor_reports(jsonb) to authenticated;
