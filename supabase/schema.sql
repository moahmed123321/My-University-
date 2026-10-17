-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run

create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  code text,
  professor text,
  color text default '#0f766e',
  created_at timestamptz default now()
);

-- Weekly lectures / labs / sections (day_of_week: 0 = Sunday ... 6 = Saturday)
create table lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  kind text default 'Lecture',
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time,
  room text
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  exam_date date not null,
  exam_time time,
  room text
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);

-- Security: every user can only see and change their own rows
do $$
declare t text;
begin
  foreach t in array array['courses','lectures','exams','tasks','assignments','topics','notes','materials']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Course Notes, Canvases, and Folders (hierarchical notes module)
create table if not exists course_notes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  parent_id text references course_notes(id) on delete cascade,
  type text not null check (type in ('note', 'canvas', 'folder')),
  title text not null default 'Untitled',
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table course_notes enable row level security;
create policy "own rows on course_notes" on course_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

