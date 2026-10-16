import { useCallback, useEffect, useRef, useState } from "react";
import { EXERCISES, isExerciseId, type ExerciseId } from "../data/exercises";
import { addDays, mondayOf, parseDate, toISO, WEEK_NAMES } from "../lib/dates";
import { deleteSet, ensureExerciseLog, ensureSession, getLastLogs, getSession, saveSet, setFeedback, type Profile, type RoutineRow, type SessionRow } from "../lib/db";
import { recommendKg, type Feedback, type LastLog } from "../lib/progress";
import { dayKeyFor, dayOrder, planText, repsUnit, setsText, type RoutineItem } from "../lib/routine";
import { FB } from "./History";
import RestTimer from "./RestTimer";
import WorkoutStep from "./WorkoutStep";

export const dayColor = (key: string) =>
  ({ upper: "var(--upper)", lower: "var(--lower)", cardio: "var(--cardio)", rest: "var(--core)" })[key] ?? "var(--upper)";

// 복근은 같은 운동이 본운동에 있어도 따로 기록되게 슬롯 이름을 구분
const coreSlot = (id: string) => `core:${id}`;

type Entry = { slot: string; item: RoutineItem };
type Mode = { kind: "overview" } | { kind: "workout"; idx: number } | { kind: "summary" };

export default function Today({ profile, routine }: { profile: Profile; routine: RoutineRow }) {
  const r = routine.data;
  const start = parseDate(profile.start_date) ?? new Date();
  const now = new Date();
  const today = toISO(now);
  const todayKey = dayKeyFor(r, start, now);
  const keys = dayOrder(r);
  const [viewKey, setViewKey] = useState(r.days[todayKey] ? todayKey : keys[0]!);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [last, setLast] = useState<Record<string, LastLog>>({});
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);
  // 이번 주 요일 칸 중 고른 칸(월=0). 같은 종류 날이 여러 번 있어 날 종류가 아니라 칸으로 표시한다
  const [sel, setSel] = useState((now.getDay() + 6) % 7);
  const [mode, setMode] = useState<Mode>({ kind: "overview" });
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [err, setErr] = useState("");
  // 세트 칸은 처음 그릴 때 기록·추천 무게로 채우므로, 둘 다 받은 뒤에 그린다
  const [loaded, setLoaded] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

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
      .catch(e => { console.error(e); setErr("오늘 운동을 불러오지 못했어요. 잠시 후 다시 열어 주세요."); });
  }, [reload, today]);

  const day = r.days[viewKey]!;
  const c = dayColor(viewKey);

  // 유산소처럼 하나만 고르는 날은 이미 기록한 것을 고른 것으로 본다
  const loggedPick = day.pickOne ? day.items.find(i => session?.exercise_logs.some(l => l.slot_id === i.id && l.set_logs.length))?.id : undefined;
  const chosen = pick ?? loggedPick ?? null;
  const mainEntries: Entry[] = day.items.filter(i => !day.pickOne || i.id === chosen).map(item => ({ slot: item.id, item }));
  // 쉬는 날(본운동이 없는 날)은 복근도 하지 않는다
  const restDay = day.items.length === 0;
  const flow: Entry[] = restDay ? [] : [...mainEntries, ...r.core.map(item => ({ slot: coreSlot(item.id), item }))];

  const logOf = (slot: string) => session?.exercise_logs.find(l => l.slot_id === slot);
  const statusOf = (e: Entry) => {
    const n = logOf(e.slot)?.set_logs.length ?? 0;
    return n >= e.item.sets ? "done" : n > 0 ? "part" : "";
  };
  const doneCount = flow.filter(e => statusOf(e) === "done").length;

  useEffect(() => { overlay.current?.scrollTo({ top: 0 }); }, [mode]);

  async function run(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); await reload(); }
    catch (e) { console.error(e); setErr("저장하지 못했어요. 잠시 후 다시 눌러 주세요."); }
  }

  async function logIdFor(slot: string, exId: string) {
    const sid = session?.id ?? (await ensureSession({ date: today, day_key: viewKey, day_title: day.title, routine_id: routine.id }));
    return ensureExerciseLog(sid, slot, exId);
  }

  const exIdOf = (e: Entry) => swaps[e.slot] ?? e.item.id;

  if (!loaded) return <div className="screen">{err ? <p className="err">{err}</p> : <p className="muted">불러오는 중…</p>}</div>;

  if (mode.kind === "workout") {
    const idx = Math.min(mode.idx, flow.length - 1);
    const e = flow[idx]!;
    const exId = exIdOf(e);
    const log = logOf(e.slot);
    const ex = isExerciseId(exId) ? EXERCISES[exId] : undefined;
    // 대체 운동은 루틴 무게가 없으니 그 운동의 지난 기록을 쓰고, 없으면 가장 가벼운 한 단위에서 시작
    const baseKg = ex?.step === undefined ? null : exId === e.item.id ? e.item.kg ?? ex.step : ex.step;
    const recKg = recommendKg({ routineKg: baseKg, routineSavedAt: exId === e.item.id ? routine.created_at : "", last: last[exId], step: ex?.step });
    const dayIds = day.items.flatMap(i => [i.id, swaps[i.id] ?? i.id]);
    const isLast = idx === flow.length - 1;
    const exDone = (log?.set_logs.length ?? 0) >= e.item.sets;

    return (
      <div className="workout" ref={overlay} style={{ "--c": c } as React.CSSProperties}>
        <div className="screen">
          <div className="wk-top">
            <div className="segs" aria-hidden="true">
              {flow.map((f, n) => <span key={f.slot} className={n === idx ? "cur" : statusOf(f) === "done" ? "done" : ""} />)}
            </div>
            <span className="wk-count">{idx + 1} / {flow.length}</span>
            <button type="button" className="icon-btn" aria-label="운동 목록으로" onClick={() => setMode({ kind: "overview" })}>✕</button>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <WorkoutStep
            key={`${e.slot}:${exId}`}
            slot={e.slot.startsWith("core:") ? e.item.id : e.slot}
            item={e.item} exId={exId} log={log} last={last[exId]} recKg={recKg}
            dayIds={e.slot.startsWith("core:") ? [] : dayIds}
            onSet={(setNo, kg, reps, done) => run(async () => {
              const id = log?.id ?? (await logIdFor(e.slot, exId));
              await (done ? saveSet(id, setNo, kg, reps) : deleteSet(id, setNo));
            })}
            onFeedback={(fb: Feedback) => run(async () => setFeedback(log?.id ?? (await logIdFor(e.slot, exId)), fb))}
            onSwap={to => {
              if (log?.set_logs.length) { setErr("이미 세트를 기록한 운동은 바꿀 수 없어요. 완료를 풀고 바꿔 주세요."); return; }
              setSwaps(s => { const n = { ...s }; if (to === e.item.id) delete n[e.slot]; else n[e.slot] = to; return n; });
            }}
            onRest={sec => setRestEnd(Date.now() + sec * 1000)}
          />
        </div>
        {restEnd !== null ? <RestTimer end={restEnd} onAdd={s => setRestEnd(restEnd + s * 1000)} onClose={() => setRestEnd(null)} /> : <div className="dock no-tab">
          <div>
            <button type="button" className="btn secondary" disabled={idx === 0} onClick={() => setMode({ kind: "workout", idx: idx - 1 })}>이전</button>
            {/* 세트가 남아 있으면 다음 운동은 보조 버튼으로 낮춘다 */}
            <button type="button" className={`btn wide ${exDone ? "primary" : "secondary"}`} onClick={() => { setRestEnd(null); setMode(isLast ? { kind: "summary" } : { kind: "workout", idx: idx + 1 }); }}>
              {isLast ? "운동 마치기" : `${isExerciseId(exIdOf(flow[idx + 1]!)) ? EXERCISES[exIdOf(flow[idx + 1]!) as ExerciseId].name : "다음 운동"} 하러 가기`}
            </button>
          </div>
        </div>}
      </div>
    );
  }

  if (mode.kind === "summary") {
    const sets = session?.exercise_logs.flatMap(l => l.set_logs) ?? [];
    const volume = sets.reduce((sum, s) => sum + (s.kg === null ? 0 : Number(s.kg) * s.reps), 0);
    const allDone = doneCount === flow.length;
    const left = flow.findIndex(e => statusOf(e) !== "done");
    const detail = (e: Entry) => {
      const s = [...(logOf(e.slot)?.set_logs ?? [])].sort((a, b) => a.set_no - b.set_no);
      return s.length ? setsText(s.map(x => ({ kg: x.kg === null ? null : Number(x.kg), reps: x.reps })), repsUnit(e.item.reps)) : "안 했어요";
    };
    return (
      <div className="workout" style={{ "--c": c } as React.CSSProperties}>
        <div className="screen">
          <div className="done-hero">
            <span className="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
            <h1>{allDone ? "오늘 운동 끝!" : "오늘은 여기까지"}</h1>
            <p className="sub">{now.getMonth() + 1}월 {now.getDate()}일 {day.title}</p>
            <div className="stats">
              <div><b>{doneCount}<small>/{flow.length}</small></b><span>마친 운동</span></div>
              <div><b>{sets.length}</b><span>세트</span></div>
              <div><b>{Math.round(volume).toLocaleString()}<small>kg</small></b><span>든 무게</span></div>
            </div>
          </div>

          <section className="sec">
            <div className="sec-head"><h2>오늘 한 운동</h2></div>
            <ul className="sum-list">
              {flow.map(e => {
                const log = logOf(e.slot), st = statusOf(e);
                return (
                  <li key={e.slot} className={st}>
                    <span className={`status ${st}`} aria-hidden="true">{st === "done" ? "✓" : ""}</span>
                    <span>{EXERCISES[exIdOf(e) as ExerciseId]?.name}{log?.feedback && <span className="badge">{FB[log.feedback]}</span>}</span>
                    <span className="r">{detail(e)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="hint">고른 체감은 다음 번 추천 무게에 반영돼요.</p>
          </section>
        </div>
        <div className="dock no-tab">
          <div>
            {!allDone && left >= 0 && <button type="button" className="btn secondary" onClick={() => setMode({ kind: "workout", idx: left })}>남은 운동 하기</button>}
            <button type="button" className="btn primary" onClick={() => setMode({ kind: "overview" })}>{allDone ? "확인" : "오늘은 끝내기"}</button>
          </div>
        </div>
      </div>
    );
  }

  const nextIdx = flow.findIndex(e => statusOf(e) !== "done");
  const mon = mondayOf(now);
  const row = (e: Entry, n: number, onClick: () => void, pickable = false) => {
    const exId = exIdOf(e);
    const ex = EXERCISES[exId as ExerciseId];
    const st = pickable ? (chosen === e.item.id ? "done" : "") : statusOf(e);
    const next = !pickable && st !== "done" && flow[nextIdx]?.slot === e.slot;
    return (
      <button type="button" className={`ex-row${next ? " next" : ""}`} key={e.slot} onClick={onClick}>
        <span className={`status ${st}`} aria-label={st === "done" ? "완료" : st === "part" ? "진행 중" : pickable ? "고르기" : `${n + 1}번째`}>{st === "done" ? "✓" : pickable ? "" : n + 1}</span>
        <img src={`/img/${ex.img}_0.webp`} alt="" width={56} height={56} loading="lazy" />
        <span>
          <b>{ex.name}{next && <em className="next-tag">다음</em>}</b>
          <small>{planText(exId === e.item.id ? e.item : { ...e.item, kg: null })}{exId !== e.item.id ? " (대체)" : ""}</small>
        </span>
      </button>
    );
  };

  return (
    <div className="screen" style={{ "--c": c } as React.CSSProperties}>
      <header className="today-head">
        <p className="date">{now.getMonth() + 1}월 {now.getDate()}일 {WEEK_NAMES[now.getDay()]}요일{viewKey !== todayKey ? `, 오늘은 ${r.days[todayKey]?.title ?? ""}` : ""}</p>
        <h1>{day.title}</h1>
        {restDay
          ? <p className="sub">운동 없이 쉬어요</p>
          : <>
              <p className="sub">운동 {flow.length}개 중 {doneCount}개 완료</p>
              <div className="progress" aria-hidden="true"><span style={{ width: `${(doneCount / flow.length) * 100}%` }} /></div>
            </>}
        <div className="week" role="group" aria-label="이번 주 일정. 누르면 그날 운동을 봐요">
          {Array.from({ length: 7 }, (_, o) => {
            const d = addDays(mon, o), k = dayKeyFor(r, start, d);
            return (
              <button type="button" key={o} className={toISO(d) === today ? "today" : ""} aria-pressed={o === sel} disabled={!r.days[k]}
                onClick={() => { setSel(o); setViewKey(k); setPick(null); }}>
                <b>{WEEK_NAMES[d.getDay()]}</b>
                <span style={{ color: dayColor(k) }}>{r.days[k]?.title.replace(/날$/, "") ?? k}</span>
              </button>
            );
          })}
        </div>
      </header>

      {err && <p className="err" role="alert">{err}</p>}

      {day.items.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            {day.pickOne ? <h2>유산소 <small>하나 골라요</small></h2> : <h2>본운동 <span>{day.items.length}</span></h2>}
            {!day.pickOne && <small>순서대로</small>}
          </div>
          <div className="ex-list">
            {day.pickOne
              ? day.items.map((item, n) => row({ slot: item.id, item }, n, () => setPick(item.id), true))
              : mainEntries.map((e, n) => row(e, n, () => setMode({ kind: "workout", idx: n })))}
          </div>
        </section>
      )}

      {day.items.length > 0 && <hr className="band" />}

      {restDay ? (
        <div className="empty">
          <p className="card-title">푹 쉬는 날이에요</p>
          <p className="sub">가볍게 걷거나 스트레칭 정도면 충분해요.</p>
        </div>
      ) : (
        <section className="sec">
          <div className="sec-head"><h2>복근 <span>{r.core.length}</span></h2><small>쉬는 날 빼고 매일</small></div>
          <div className="ex-list">
          {flow.slice(mainEntries.length).map((e, n) => row(e, n, () => setMode({ kind: "workout", idx: mainEntries.length + n })))}
          </div>
        </section>
      )}

      {!restDay && <div className="dock">
        <div>
          {day.pickOne && !chosen
            ? <button type="button" className="btn primary" disabled>유산소를 하나 골라요</button>
            : <button type="button" className="btn primary" onClick={() => setMode(nextIdx < 0 ? { kind: "summary" } : { kind: "workout", idx: nextIdx })}>
                {nextIdx < 0 ? "오늘 운동 요약 보기" : doneCount === 0 && !flow.some(e => statusOf(e) === "part") ? "운동 시작" : `${EXERCISES[exIdOf(flow[nextIdx]!) as ExerciseId]?.name ?? "남은 운동"}부터 이어서 하기`}
              </button>}
        </div>
      </div>}
    </div>
  );
}
