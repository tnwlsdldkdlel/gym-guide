-- 운동 앱 초기 스키마. `npx supabase db push`로 원격에 적용한다.
-- 모든 테이블은 RLS로 본인 행만 읽고 쓸 수 있다. user_id는 기본값 auth.uid()로 채워진다.

create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users on delete cascade,
  gender text not null check (gender in ('m', 'f')),
  start_date date not null,
  created_at timestamptz not null default now()
);

-- 루틴은 덮어쓰지 않고 새 행으로 쌓는다. 가장 최근 행이 현재 루틴
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists routines_user_created on public.routines (user_id, created_at desc);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  day_key text not null,
  day_title text not null,
  routine_id uuid references public.routines on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.workout_sessions on delete cascade,
  -- 루틴상 원래 운동. 대체했으면 exercise_id와 다르다
  slot_id text not null,
  exercise_id text not null,
  feedback text check (feedback in ('light', 'ok', 'heavy')),
  created_at timestamptz not null default now(),
  unique (session_id, slot_id)
);
create index if not exists exercise_logs_user_exercise on public.exercise_logs (user_id, exercise_id, created_at desc);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_log_id uuid not null references public.exercise_logs on delete cascade,
  set_no int not null check (set_no between 1 and 20),
  kg numeric(5, 1) check (kg is null or kg between 0 and 500),
  -- 근력은 횟수, 시간 운동은 초 또는 분
  reps int not null check (reps between 0 and 999),
  created_at timestamptz not null default now(),
  unique (exercise_log_id, set_no)
);

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "own routines" on public.routines;
create policy "own routines" on public.routines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own sessions" on public.workout_sessions;
create policy "own sessions" on public.workout_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own exercise logs" on public.exercise_logs;
create policy "own exercise logs" on public.exercise_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own set logs" on public.set_logs;
create policy "own set logs" on public.set_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
