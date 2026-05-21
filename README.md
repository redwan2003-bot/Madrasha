# Madrasha - Class Monitoring App

Bengali-language class monitoring for Shivganj Fazil Degree Madrasha.

## Run locally

cd web
copy .env.local.example .env.local
npm install
npm run dev

Open http://localhost:3000 - see README-SUPABASE.md for Supabase setup.

## Layout

- web/ - Next.js + Supabase
- supabase/ - DB migrations and Edge Functions
- *.html, api/ - Legacy app (migration in progress)
