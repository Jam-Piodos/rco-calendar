-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create events table
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  date timestamp with time zone not null,
  participants integer default 0,
  created_by uuid references auth.users(id) on delete cascade not null,
  location text,
  status text default 'upcoming'::text check (status in ('upcoming', 'ongoing', 'completed', 'cancelled'))
);

-- Create event_participants table for tracking who's attending
create table if not exists public.event_participants (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'registered'::text check (status in ('registered', 'attended', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Events policies
create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Authenticated users can create events"
  on public.events for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own events"
  on public.events for update
  using (auth.uid() = created_by);

create policy "Users can delete their own events"
  on public.events for delete
  using (auth.uid() = created_by);

-- Event participants policies
create policy "Event participants are viewable by everyone"
  on public.event_participants for select
  using (true);

create policy "Authenticated users can register for events"
  on public.event_participants for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own event registrations"
  on public.event_participants for update
  using (auth.uid() = user_id);

create policy "Users can delete their own event registrations"
  on public.event_participants for delete
  using (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();