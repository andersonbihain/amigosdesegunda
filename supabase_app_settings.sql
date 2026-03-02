create table if not exists public.app_settings (
    key text primary key,
    value text,
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "app_settings_write_authenticated" on public.app_settings;
create policy "app_settings_write_authenticated"
on public.app_settings
for all
to authenticated
using (true)
with check (true);

insert into public.app_settings (key, value)
values ('default_filter_start_date', '2026-01-01')
on conflict (key) do nothing;
