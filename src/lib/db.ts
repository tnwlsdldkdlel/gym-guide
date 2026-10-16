import { createClient } from "@supabase/supabase-js";
import { makeAuthStorage } from "./authStorage";
import type { Feedback, LastLog } from "./progress";
import type { LogSummary, Routine } from "./routine";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const configured = Boolean(url && key);
export const authStorage = makeAuthStorage(localStorage, sessionStorage);
export const supabase = createClient(url ?? "http://localhost", key ?? "missing", { auth: { storage: authStorage } });

export interface Profile { id: string; gender: "m" | "f"; start_date: string }
export interface RoutineRow { id: string; data: Routine; created_at: string }
export interface SetRow { id: string; set_no: number; kg: number | null; reps: number }
export interface ExerciseLogRow { id: string; slot_id: string; exercise_id: string; feedback: Feedback | null; created_at: string; set_logs: SetRow[] }
export interface SessionRow { id: string; date: string; day_key: string; day_title: string; exercise_logs: ExerciseLogRow[] }

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export async function getProfile(): Promise<Profile | null> {
  return must(await supabase.from("profiles").select("id, gender, start_date").maybeSingle()) as Profile | null;
}

export async function saveProfile(p: { gender: "m" | "f"; start_date: string }): Promise<void> {
  must(await supabase.from("profiles").upsert(p));
}

export async function getActiveRoutine(): Promise<RoutineRow | null> {
  return must(await supabase.from("routines").select("id, data, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()) as RoutineRow | null;
}

export async function saveRoutine(data: Routine): Promise<RoutineRow> {
  return must(await supabase.from("routines").insert({ data }).select("id, data, created_at").single()) as RoutineRow;
}

const SESSION_SELECT = "id, date, day_key, day_title, exercise_logs(id, slot_id, exercise_id, feedback, created_at, set_logs(id, set_no, kg, reps))";

export async function getSession(date: string): Promise<SessionRow | null> {
  return must(await supabase.from("workout_sessions").select(SESSION_SELECT).eq("date", date).maybeSingle()) as SessionRow | null;
}

export async function ensureSession(s: { date: string; day_key: string; day_title: string; routine_id: string }): Promise<string> {
  const row = must(await supabase.from("workout_sessions").upsert(s, { onConflict: "user_id,date" }).select("id").single()) as { id: string };
  return row.id;
}

export async function ensureExerciseLog(sessionId: string, slotId: string, exerciseId: string): Promise<string> {
  const row = must(await supabase.from("exercise_logs")
    .upsert({ session_id: sessionId, slot_id: slotId, exercise_id: exerciseId }, { onConflict: "session_id,slot_id" })
    .select("id").single()) as { id: string };
  return row.id;
}

export async function setFeedback(exerciseLogId: string, feedback: Feedback): Promise<void> {
  must(await supabase.from("exercise_logs").update({ feedback }).eq("id", exerciseLogId));
}

export async function saveSet(exerciseLogId: string, setNo: number, kg: number | null, reps: number): Promise<void> {
  must(await supabase.from("set_logs").upsert({ exercise_log_id: exerciseLogId, set_no: setNo, kg, reps }, { onConflict: "exercise_log_id,set_no" }));
}

export async function deleteSet(exerciseLogId: string, setNo: number): Promise<void> {
  must(await supabase.from("set_logs").delete().eq("exercise_log_id", exerciseLogId).eq("set_no", setNo));
}

/** 오늘 이전의 운동별 마지막 기록 */
export async function getLastLogs(exerciseIds: string[], beforeDate: string): Promise<Record<string, LastLog>> {
  if (!exerciseIds.length) return {};
  const rows = must(await supabase.from("exercise_logs")
    .select("exercise_id, feedback, created_at, set_logs(kg), workout_sessions!inner(date)")
    .in("exercise_id", exerciseIds).lt("workout_sessions.date", beforeDate)
    .order("created_at", { ascending: false }).limit(200)) as unknown as { exercise_id: string; feedback: Feedback | null; created_at: string; set_logs: { kg: number | null }[] }[];
  const out: Record<string, LastLog> = {};
  for (const r of rows) {
    if (out[r.exercise_id] || !r.set_logs.length) continue;
    const kgs = r.set_logs.map(s => s.kg).filter((k): k is number => k !== null);
    out[r.exercise_id] = { kg: kgs.length ? Math.max(...kgs) : null, feedback: r.feedback, at: r.created_at };
  }
  return out;
}

export async function getHistory(limit = 30): Promise<SessionRow[]> {
  return must(await supabase.from("workout_sessions").select(SESSION_SELECT).order("date", { ascending: false }).limit(limit)) as SessionRow[];
}

export function toSummaries(sessions: SessionRow[]): LogSummary[] {
  return sessions.map(s => ({
    date: s.date,
    dayTitle: s.day_title,
    exercises: s.exercise_logs.filter(e => e.set_logs.length).map(e => ({
      id: e.exercise_id,
      feedback: e.feedback,
      sets: [...e.set_logs].sort((a, b) => a.set_no - b.set_no).map(x => ({ kg: x.kg === null ? null : Number(x.kg), reps: x.reps })),
    })),
  })).filter(s => s.exercises.length);
}
