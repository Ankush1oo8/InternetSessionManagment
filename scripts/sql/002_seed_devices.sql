insert into public.devices (id, name, status, mb_per_minute)
values
  ('dev-a','Device A','available',3),
  ('dev-b','Device B','available',2),
  ('dev-c','Device C','available',4)
on conflict (id) do update
set name = excluded.name,
    status = excluded.status,
    mb_per_minute = excluded.mb_per_minute;
