-- 운동별 기구 세팅 메모("의자 4번, 핀 5칸"). 사람·운동마다 한 줄이고, 비우면 행을 지운다
create table if not exists public.exercise_memos (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id text not null,
  memo text not null check (char_length(memo) between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_memos enable row level security;
drop policy if exists "own exercise memos" on public.exercise_memos;
create policy "own exercise memos" on public.exercise_memos for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
