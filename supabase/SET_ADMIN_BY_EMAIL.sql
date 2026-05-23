-- Run in Supabase SQL Editor after Google sign-in (creates profiles row).

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'rahmmed2330756@bscse.uiu.ac.bd'
  limit 1
);

select p.id, p.role, p.teacher_index, u.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'rahmmed2330756@bscse.uiu.ac.bd';
