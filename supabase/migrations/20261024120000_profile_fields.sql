-- Profile UI reads and edits username, bio, and banner_url.
-- Add the columns the existing profiles table is missing.

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists banner_url text;

comment on column public.profiles.username is 'Public handle shown as @username';
comment on column public.profiles.bio is 'Short profile biography';
comment on column public.profiles.banner_url is 'Profile banner image URL';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$');
  end if;
end $$;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;
