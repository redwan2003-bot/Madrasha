# Google Sign-In setup

Project: `mqrhfdwutzqhovaislho`  
App callback: `http://localhost:3000/auth/callback` (add production URL when deployed)

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. **APIs & Services → OAuth consent screen** — configure (External or Internal for Workspace).
4. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**
     - `http://localhost:3000`
     - `https://YOUR-PRODUCTION-DOMAIN.com` (when live)
   - **Authorized redirect URIs** (Supabase handles OAuth — use this exact URL):
     - `https://mqrhfdwutzqhovaislho.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client secret**.

## 2. Supabase Dashboard

1. [Authentication → Providers → Google](https://supabase.com/dashboard/project/mqrhfdwutzqhovaislho/auth/providers)
2. Enable **Google**.
3. Paste Client ID and Client secret.
4. Save.

## 3. Redirect URLs (Supabase)

[Authentication → URL Configuration](https://supabase.com/dashboard/project/mqrhfdwutzqhovaislho/auth/url-configuration)

| Setting | Value |
|---------|--------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |
| | `http://localhost:3000/**` |
| | `https://YOUR-PRODUCTION-DOMAIN.com/auth/callback` |

## 4. SQL (optional, after first Google login)

New users get `profiles.role = teacher` by default. Promote your account to admin:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'your@gmail.com' limit 1
);
```

If the main schema is already applied, run **`supabase/PATCH_GOOGLE_AUTH_ONLY.sql`** only (not `RUN_IN_SQL_EDITOR.sql` again).

If you see `type "app_role" already exists`, you re-ran the full schema by mistake — use `PATCH_GOOGLE_AUTH_ONLY.sql` instead.

## 5. Test locally

```powershell
cd web
npm run dev
```

Open http://localhost:3000/login → **Google দিয়ে প্রবেশ**.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Google redirect URI must be `https://mqrhfdwutzqhovaislho.supabase.co/auth/v1/callback` only |
| Returns to login with `?error=auth` | Add `http://localhost:3000/auth/callback` in Supabase Redirect URLs |
| Logged in but no data | Run DB migrations; set `profiles.role` |
