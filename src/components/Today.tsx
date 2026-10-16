import { useCallback, useEffect, useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { addDays, mondayOf, parseDate, toISO, WEEK_NAMES } from "../lib/dates";
import { deleteSet, ensureExerciseLog, ensureSession, getLastLogs, getSession, saveSet, setFeedback, type Profile, type RoutineRow, type SessionRow } from "../lib/db";
import { recommendKg, type Feedback, type LastLog } from "../lib/progress";
import { dayKeyFor, type RoutineItem } from "../lib/routine";
import ExerciseCard from "./ExerciseCard";
import RestTimer from "./RestTimer";

export const dayColor = (key: string) =>
  ({ upper: "var(--upper)", lower: "var(--lower)", cardio: "var(--cardio)", rest: "var(--core)" })[key] ?? "var(--upper)";

// 복근은 같은 운동이 본운동에 있어도 따로 기록되게 슬롯 이름을 구분
const coreSlot = (id: string) => `core:${id}`;

export default function Today({ profile, routine }: { profile: Profile; routine: RoutineRow }) {
  const r = routine.data;
  const start = parseDate(profile.start_date) ?? new Date();
  const now = new Date();
  const today = toISO(now);
  const todayKey = dayKeyFor(r, start, now);
  const keys = Object.keys(r.days);
  const [viewKey, setViewKey] = useState(r.days[todayKey] ? todayKey : keys[0]!);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [last, setLast] = useState<Record<string, LastLog>>({});
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [err, setErr] = useState("");
  // 카드의 세트 칸은 처음 그릴 때 기록·추천 무게로 채우므로, 둘 다 받은 뒤에 그린다
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const s = await getSession(today);
    setSession(s);
    if (s) setSwaps(prev => {
      const next = { ...prev };
      for (const l of s.exercise_logs) if (l.exercise_id !== l.slot_id && !(l.slot_id in next)) next[l.slot_id] = l.exercise_id;
      return next;
    });
  }, [today]);

  useEffect(() => {
    Promise.all([reload(), getLastLogs(Object.keys(EXERCISES), today).then(setLast)])
      .then(() => setLoaded(true))
      .catch((e: Error) => setErr(e.message));
  }, [reload, today]);

  const day = r.days[viewKey]!;
  const c = dayColor(viewKey);

  async function run(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); await reload(); }
    catch (e) { setErr(`저장하지 못했습니다: ${(e as Error).message}`); }
  }

  async function logIdFor(slot: string, exId: string) {
    const sid = session?.id ?? (await ensureSession({ date: today, day_key: viewKey, day_title: day.title, routine_id: routine.id }));
    return ensureExerciseLog(sid, slot, exId);
  }

  function card(item: RoutineItem, slot: string, no: number | undefined, dayIds: string[]) {
    const exId = swaps[slot] ?? item.id;
    const log = session?.exercise_logs.find(l => l.slot_id === slot);
    // 대체 운동은 루틴 무게가 없으니 그 운동의 지난 기록을 쓰고, 없으면 가장 가벼운 한 단위에서 시작
    const ex = isExerciseId(exId) ? EXERCISES[exId] : undefined;
    const baseKg = ex?.step === undefined ? null : exId === item.id ? item.kg ?? ex.step : ex.step;
    const recKg = recommendKg({ routineKg: baseKg, routineSavedAt: exId === item.id ? routine.created_at : "", last: last[exId], step: ex?.step });
    return (
      <ExerciseCard
        key={`${slot}:${exId}`}
        no={no} slot={slot} item={item} exId={exId} log={log} last={last[exId]} recKg={recKg} dayIds={dayIds}
        onSet={(setNo, kg, reps, done) => run(async () => {
          const id = log?.id ?? (await logIdFor(slot, exId));
          await (done ? saveSet(id, setNo, kg, reps) : deleteSet(id, setNo));
        })}
        onFeedback={(fb: Feedback) => run(async () => setFeedback(log?.id ?? (await logIdFor(slot, exId)), fb))}
        onSwap={to => {
          if (log?.set_logs.length) { setErr("이미 세트를 기록한 운동은 바꿀 수 없습니다. 완료를 풀고 바꾸세요."); return; }
          setSwaps(s => { const n = { ...s }; if (to === slot) delete n[slot]; else n[slot] = to; return n; });
        }}
        onRest={sec => setRestEnd(Date.now() + sec * 1000)}
      />
    );
  }

  if (!loaded) return err ? <p className="err">불러오지 못했습니다: {err}</p> : <p className="muted">불러오는 중…</p>;

  const mon = mondayOf(now);
  const dayIds = day.items.flatMap(i => [i.id, swaps[i.id] ?? i.id]);

  return (
    <>
      <nav className="tabs" role="tablist" aria-label="운동 날">
        {keys.map(k => (
          <button key={k} role="tab" style={{ "--c": dayColor(k) } as React.CSSProperties} aria-selected={k === viewKey}
            onClick={() => { setViewKey(k); window.scrollTo({ top: 0 }); }}>
            <span className={k === todayKey ? "today-dot" : ""}>{r.days[k]!.title}</span>
          </button>
        ))}
      </nav>

      <div className="week" aria-label="이번 주 일정">
        {Array.from({ length: 7 }, (_, o) => {
          const d = addDays(mon, o), k = dayKeyFor(r, start, d);
          return (
            <div key={o} className={toISO(d) === today ? "on" : ""}>
              <b>{WEEK_NAMES[d.getDay()]}</b>
              <span style={{ color: dayColor(k) }}>{r.days[k]?.title.replace(/날$/, "") ?? k}</span>
            </div>
          );
        })}
      </div>

      {r.note && <p className="muted" style={{ margin: 0 }}>루틴 메모: {r.note}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {viewKey !== todayKey && <p className="hint">오늘은 {r.days[todayKey]?.title ?? todayKey}입니다. 다른 날 운동을 해도 오늘 날짜로 기록됩니다.</p>}

      <section style={{ "--c": c } as React.CSSProperties}>
        <div className="day-head">
          <h2>{day.title}</h2>
          <p>{day.pickOne ? "아래 중 하나를 골라서" : `본운동 ${day.items.length}개`} + 복근 {r.core.length}개</p>
        </div>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {day.items.length > 0 && (
            <>
              <div className="group-label">{day.pickOne ? "셋 중 하나 골라서" : "본운동 · 순서대로"}</div>
              <div className="list">{day.items.map((it, i) => card(it, it.id, day.pickOne ? undefined : i + 1, dayIds))}</div>
            </>
          )}
          <div className="group-label" style={{ "--c": "var(--core-fill)" } as React.CSSProperties}>복근 · 매일</div>
          <div className="list core">{r.core.map((it, i) => card(it, coreSlot(it.id), i + 1, []))}</div>
        </div>
      </section>

      {restEnd !== null && <RestTimer end={restEnd} onAdd={s => setRestEnd(restEnd + s * 1000)} onClose={() => setRestEnd(null)} />}
    </>
  );
}
