-- Drop foreign key so store_settings no longer references users
alter table store_settings drop constraint if exists store_settings_id_fkey;
alter table store_settings enable row level security;

-- Allow all authenticated users to access the single global settings row
create policy "read global store settings" on store_settings
  for select using (id = '00000000-0000-0000-0000-000000000000');

create policy "insert global store settings" on store_settings
  for insert with check (
    auth.role() = 'authenticated' and
    id = '00000000-0000-0000-0000-000000000000'
  );

create policy "update global store settings" on store_settings
  for update using (
    auth.role() = 'authenticated' and
    id = '00000000-0000-0000-0000-000000000000'
  )
  with check (
    auth.role() = 'authenticated' and
    id = '00000000-0000-0000-0000-000000000000'
  );
