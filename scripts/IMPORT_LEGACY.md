# Import legacy data into Supabase

## 1. Upload export endpoint (one-time)

**Only one file required** (self-contained; does not need a new `functions.php`):

| Local path | Upload to server |
|------------|------------------|
| `deploy/sfdm-upload/export_for_supabase.php` | `public_html/api/export_for_supabase.php` |

Or use zip: `deploy/sfdm-api-export.zip` (extract, upload the PHP file).

cPanel: **File Manager → public_html → api → Upload** (same folder as `api.php`).

Optional: also upload `api/functions.php` + patch `api/api.php` if you want `?action=export_for_supabase` on `api.php` too.

Default secret: `madrasha-supabase-import`  
Override on server: set env `LEGACY_IMPORT_SECRET`.

Test in browser (should return JSON with `"status":"success"`):

```
https://sfdm.xyz/api/export_for_supabase.php?import_secret=madrasha-supabase-import
```

## 2. Configure Next.js env

`web/.env.local` must include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required for bulk import)

Optional:

```env
LEGACY_API_URL=https://sfdm.xyz/api/api.php
LEGACY_EXPORT_URL=https://sfdm.xyz/api/export_for_supabase.php
LEGACY_IMPORT_SECRET=madrasha-supabase-import
```

## 3. Run import

```powershell
cd "c:\Users\Redwan Ahmmed\Downloads\Class Monitoring App\web"
npm run import:legacy
```

This will:

1. Download full MySQL export (teachers, routine, leaves, reports, students, messages, …)
2. Clear Supabase tables (service role)
3. Upsert all rows
4. Call `generate-duty-roster` for today

To merge without clearing first:

```powershell
npm run import:legacy -- --no-truncate
```

## 4. Set admin after import

Run in Supabase SQL Editor:

```sql
-- supabase/PATCH_PANEL_PAGES.sql  (includes admin + RPCs)
-- or supabase/SET_ADMIN_BY_EMAIL.sql
```

## Fallback (no upload)

If export URL is not deployed, the script uses public APIs only (teachers, team, messages, today's reports, routine by weekday, leaves list via report). **Reports history and monthly attendance need the full export file.**

## Google Sheets (students / routines on Sheets)

Routine pages (`weeklyroutine.html`, etc.) use Google Apps Script — separate from MySQL. The monitoring app uses **MySQL `routine`** via PHP; that is included in the full export.

Student roster on Sheets (`sutdentdata.html`) may differ from MySQL `students`. Full export uses MySQL `students` when available.

## Security

- Change `LEGACY_IMPORT_SECRET` on production after import.
- Never commit `db_connect.php` or `.env.local`.
- Export strips teacher passwords.
