Upload to sfdm.xyz
==================

Option A — Automated FTP (from your PC)
---------------------------------------
1. cPanel → FTP Accounts → note host, username, password.
   (NOT api/db_connect.php — that is MySQL only.)
2. Copy deploy/.ftp.env.example → deploy/.ftp.env and fill values.
3. In PowerShell from project root:

   powershell -ExecutionPolicy Bypass -File scripts\upload-export-to-sfdm.ps1

If upload times out, your network or host may block FTP; use Option B.

Option B — cPanel File Manager
------------------------------

1. Log in to cPanel → File Manager
2. Open: public_html/api/   (same folder as api.php and db_connect.php)
3. Upload this file:
   - export_for_supabase.php  (from this folder)

You do NOT need to replace functions.php if you use the self-contained export file above.

4. Test in browser:
   https://sfdm.xyz/api/export_for_supabase.php?import_secret=madrasha-supabase-import

   Expected: JSON starting with {"status":"success","counts":{...

5. On your PC, run full import:
   cd web
   npm run import:legacy
