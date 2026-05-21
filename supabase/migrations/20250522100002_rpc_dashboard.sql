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
    and trim(r.monitor_report_text) <> 'ঠিক আছে'
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
