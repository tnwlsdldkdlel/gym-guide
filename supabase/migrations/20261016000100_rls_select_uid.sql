-- auth.uid()를 (select auth.uid())로 감싸 행마다 다시 계산하지 않게 한다 (Supabase advisor 0003)
alter policy "own profile" on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "own routines" on public.routines using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own sessions" on public.workout_sessions using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own exercise logs" on public.exercise_logs using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own set logs" on public.set_logs using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
