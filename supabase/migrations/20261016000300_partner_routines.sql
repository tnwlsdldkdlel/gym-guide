-- 부부가 루틴 하나를 같이 쓴다. 루틴은 각자 자기 행으로 저장하고, 연결된 상대의 루틴은 읽기만 한다.
-- 둘 중 가장 최근 행이 공용 루틴이다. 기록(세션·세트)은 계속 본인만 본다.
-- 연결 행은 양방향 두 줄을 SQL로 직접 넣는다(앱에서 연결·해제하는 화면은 없다).
create table if not exists public.partners (
  user_id uuid not null references auth.users on delete cascade,
  partner_id uuid not null references auth.users on delete cascade,
  primary key (user_id, partner_id),
  check (user_id <> partner_id)
);

alter table public.partners enable row level security;
drop policy if exists "own partner links" on public.partners;
create policy "own partner links" on public.partners for select using (user_id = (select auth.uid()));

-- 기존 "own routines"(for all)는 그대로 두고 상대 루틴 읽기만 추가한다
drop policy if exists "partner routines read" on public.routines;
create policy "partner routines read" on public.routines for select
  using (user_id in (select partner_id from public.partners where user_id = (select auth.uid())));
