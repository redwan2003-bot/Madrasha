-- Optional seed for local dev (run after migrations)
-- Example admin message keys used by legacy app

insert into public.special_messages (message_key, message_value) values
  ('holiday_notice', ''),
  ('marquee_text', 'ক্লাস মনিটরিং সিস্টেম')
on conflict (message_key) do nothing;

-- Sample teacher (link to auth.users manually in Supabase dashboard)
-- insert into public.teachers (index_no, teacher_fn, designation, role)
-- values ('001', 'ডেমো শিক্ষক', 'প্রভাষক', 'Admin');
