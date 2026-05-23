-- Run this to check if the database is already set up.
-- If you see table names below, RUN_IN_SQL_EDITOR.sql is NOT needed again.

select 'app_role enum' as check_item,
  exists (select 1 from pg_type where typname = 'app_role') as ok;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'teachers', 'profiles', 'routine', 'reports', 'leaves',
    'monitoring_team', 'duty_roster_daily', 'special_messages'
  )
order by table_name;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_monitoring_dashboard',
    'get_leave_card_summary',
    'upsert_monthly_attendance',
    'office_submit_leave',
    'batch_submit_monitor_reports'
  )
order by routine_name;
