-- Create a table for public profiles using Supabase's auth.users table properties
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Enable Row Level Security (RLS) for privacy
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Handle new user signup: Automatically create a profile entry
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Create the Itineraries table
create table public.itineraries (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date,
  end_date date,
  content jsonb not null, -- Stores the full itinerary structure
  is_public boolean default false,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Enable RLS for Itineraries
alter table public.itineraries enable row level security;

-- Policies for Itineraries
create policy "Public itineraries are viewable by everyone."
  on itineraries for select
  using ( is_public = true );

create policy "Users can view their own itineraries."
  on itineraries for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own itineraries."
  on itineraries for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own itineraries."
  on itineraries for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own itineraries."
  on itineraries for delete
  using ( auth.uid() = user_id );
