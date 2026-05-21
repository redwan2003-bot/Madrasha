# MySQL → Supabase import notes

## Export from legacy DB

```sql
-- Example: teachers without password column in export
SELECT IndexNo, TeacherFN, Designation, TeacherSub, TcrAddress, MobileNo, Grade, Role, PhotoUrl
FROM teachers;
```

## CSV import order

1. `teachers`
2. `monitoring_team`
3. `routine`
4. `leaves`
5. `reports` (historical)
6. `students`
7. `student_monthly_attendance`
8. `special_messages`, `saved_messages`
9. `duty_history`, `temporary_duties`

Use Supabase Table Editor → Import, or `psql \copy` with snake_case headers.

## Column rename cheat sheet

| MySQL | Postgres |
|-------|----------|
| IndexNo | index_no |
| TeacherFN | teacher_fn |
| TeacherIndex | teacher_index |
| MonitorDay | monitor_day |
| ReportDate | report_date |
| MonitorReportText | monitor_report_text |
| MessageKey | message_key |
| MessageValue | message_value |

After import, run Edge Function `generate-duty-roster` for each active school day or backfill `duty_roster_daily`.
