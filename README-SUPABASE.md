# Class Monitoring App — Supabase + Next.js

Production-oriented stack alongside legacy HTML/PHP (kept until migration completes).

## Structure

```
supabase/
  migrations/          # Postgres schema, RLS, RPC
  functions/           # Edge Function: generate-duty-roster
  seed.sql
web/                   # Next.js 15 app (Supabase client)
api/                   # Legacy PHP (deprecate after cutover)
*.html                 # Legacy pages
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Supabase project (cloud) or local via `supabase start`

## 1. Create Supabase project

1. [supabase.com](https://supabase.com) → New project (region: **Singapore** `ap-southeast-1` recommended).
2. Dashboard → **Project Settings → API** → copy URL and `anon` key.
3. Copy **service_role** key (server only — never expose to browser).

## 2. Apply database migrations

```powershell
cd "c:\Users\Redwan Ahmmed\Downloads\Class Monitoring App"
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste each file in **SQL Editor** (order: `20250522100000` → `20250522100001` → `20250522100002`).

## 3. Configure Next.js app

```powershell
cd web
copy .env.local.example .env.local
# Edit .env.local with your Supabase URL and keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/login` when not authenticated.

## 4. Import legacy MySQL data

Export from cPanel/phpMyAdmin, then map columns:

| MySQL | Postgres |
|-------|----------|
| `IndexNo` | `teachers.index_no` |
| `TeacherFN` | `teachers.teacher_fn` |
| `Password` | **Do not import** — create Supabase Auth users instead |
| `ReportDate` | `reports.report_date` |
| … | snake_case columns in migrations |

**Teachers → Auth (one-time):**

1. Import rows into `teachers` (without passwords).
2. Create users in Supabase Auth (email per teacher or `index@madrasa.local`).
3. Update `profiles.teacher_index` and `profiles.role` (`admin`, `office`, `monitor`, etc.).
4. Optionally set `teachers.user_id` = `auth.users.id`.

## 5. Deploy Edge Function (duty roster)

```powershell
supabase functions deploy generate-duty-roster
```

Invoke manually:

```powershell
curl -X POST "https://YOUR_REF.supabase.co/functions/v1/generate-duty-roster" `
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Schedule daily (05:00 Asia/Dhaka):

- **Supabase Dashboard** → Edge Functions → Schedules, or  
- **Vercel Cron** → `GET /api/cron/duty-roster` with `CRON_SECRET` (see `web/app/api/cron/duty-roster/route.ts`).

## 6. Auth & roles

| Role | `profiles.role` | Access |
|------|-----------------|--------|
| teacher | `teacher` | Own leave, profile |
| monitor | `monitor` | + submit reports (via `monitoring_team`) |
| team_lead | `team_lead` | + reassign duty |
| office | `office` | + attendance, students |
| admin | `admin` | Full admin tables |

## 7. Realtime

Enabled on `reports`, `temporary_duties`, `duty_roster_daily`. The Next app subscribes in `use-monitoring-dashboard.ts` and invalidates TanStack Query cache (replaces 60s full reload polling).

## 8. Deploy frontend

**Vercel (recommended):**

1. Import `web/` as project root (or monorepo subfolder).
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
3. Supabase → Auth → URL Configuration → add Vercel URL to redirect allow list.

## Security checklist

- [ ] Rotate MySQL password that was in `api/db_connect.php`
- [ ] Never commit `.env.local` or service role key
- [ ] Disable legacy PHP public URL when Next app is live
- [ ] Restrict Supabase Auth signup (invite-only) in production

## Migration status

| Area | Status |
|------|--------|
| Schema + RLS + RPC | Done |
| Duty roster Edge Function | Done |
| Main dashboard shell + Realtime | Done |
| Full `index.html` UI port | Pending |
| Office / Admin / Students | Placeholder pages |
| Apps Script routine pages | Pending (optional: keep or migrate `routine` table) |

## Commands reference

```powershell
# Local Supabase stack
supabase start

# Regenerate TypeScript types (after schema changes)
supabase gen types typescript --linked > web/types/supabase-generated.ts

# Web app
cd web && npm run dev && npm run build
```
