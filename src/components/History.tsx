import { useEffect, useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { dayMark, monthCells, parseDate, toISO, WEEK_NAMES } from "../lib/dates";
import { getHistory, toSummaries, type RoutineRow } from "../lib/db";
import { dayKeyFor, setsText, unitsOf, type LogSummary } from "../lib/routine";
import { dayColor } from "./Today";

export const FB = { light: "가벼웠어요", ok: "적당했어요", heavy: "무거웠어요" } as const;

// 최근 세션 120개까지만 불러온다. 그보다 오래된 날은 기록이 있어도 모르니 엑스를 치지 않는다
const LIMIT = 120;
const CAL_HEAD = ["월", "화", "수", "목", "금", "토", "일"];

function dateLabel(iso: string) {
  const d = parseDate(iso);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK_NAMES[d.getDay()]}요일` : iso;
}

function DayLog({ l, units }: { l: LogSummary; units: Record<string, string> }) {
  const sets = l.exercises.flatMap(e => e.sets);
  const volume = sets.reduce((sum, s) => sum + (s.kg ?? 0) * s.reps, 0);
  const color = dayColor(l.dayKey ?? "");
  return (
    <section className="day-log">
      <div className="day-log-head">
        <h2>{dateLabel(l.date)}</h2>
        <span className="day-chip" style={{ color, background: `color-mix(in srgb, ${color} 10%, #fff)` }}>{l.dayTitle}</span>
      </div>
      <p className="hint">운동 {l.exercises.length}개, {sets.length}세트{volume ? `, ${Math.round(volume).toLocaleString()}kg` : ""}</p>
      <ul className="sum-list plain">
        {l.exercises.map(e => (
          <li key={e.id}>
            <span>{isExerciseId(e.id) ? EXERCISES[e.id].name : e.id}{e.feedback && <span className="badge">{FB[e.feedback]}</span>}</span>
            <span className="r">{setsText(e.sets, units[e.id] ?? "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function History({ routine, startDate }: { routine: RoutineRow; startDate: string }) {
  const [logs, setLogs] = useState<LogSummary[] | null>(null);
  const [fetchedAll, setFetchedAll] = useState(false);
  const [err, setErr] = useState("");
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    getHistory(LIMIT)
      .then(s => { setLogs(toSummaries(s)); setFetchedAll(s.length < LIMIT); })
      .catch(e => { console.error(e); setErr("기록을 불러오지 못했어요. 잠시 후 다시 열어 주세요."); });
  }, []);

  const units = unitsOf(routine.data);
  const start = parseDate(startDate) ?? now;
  const byDate = new Map((logs ?? []).map(l => [l.date, l]));
  const today = toISO(now);
  const oldest = logs?.at(-1)?.date ?? today;
  const from = fetchedAll || oldest < startDate ? startDate : oldest;
  const cells = monthCells(month.y, month.m);
  const monthKey = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;
  const monthCount = (logs ?? []).filter(l => l.date.startsWith(monthKey)).length;
  const isThisMonth = month.y === now.getFullYear() && month.m === now.getMonth();
  const move = (n: number) => { const d = new Date(month.y, month.m + n, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); setSel(null); };
  const picked = sel ? byDate.get(sel) : undefined;

  return (
    <div className="screen">
      <h1 className="title">기록</h1>
      {err && <p className="err">{err}</p>}
      {!err && !logs && <p className="muted">불러오는 중…</p>}

      {logs && (
        <section className="cal">
          <div className="cal-head">
            <button type="button" className="icon-btn" aria-label="이전 달" onClick={() => move(-1)}>‹</button>
            <div>
              <h2>{month.y}년 {month.m + 1}월</h2>
              <p className="hint">{monthCount ? `${monthCount}번 운동했어요` : "운동 기록이 없어요"}</p>
            </div>
            <button type="button" className="icon-btn" aria-label="다음 달" disabled={isThisMonth} onClick={() => move(1)}>›</button>
          </div>
          <div className="cal-grid">
            {CAL_HEAD.map(w => <span key={w} className="cal-wk">{w}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const iso = toISO(d), log = byDate.get(iso);
              // 쉬는 날은 안 하는 게 맞으니 엑스를 치지 않는다(지금 루틴 기준)
              const rest = !routine.data.days[dayKeyFor(routine.data, start, d)]?.items.length;
              const mark = rest && !log ? "" : dayMark(iso, Boolean(log), from, today);
              return (
                <button type="button" key={iso}
                  className={`cal-day ${mark}${iso === today ? " today" : ""}${iso > today ? " future" : ""}`}
                  style={log ? { "--dc": dayColor(log.dayKey ?? "") } as React.CSSProperties : undefined}
                  aria-pressed={sel === iso}
                  aria-label={`${d.getDate()}일${mark === "done" ? `, ${log!.dayTitle} 운동함` : mark === "miss" ? ", 운동 안 함" : ""}`}
                  onClick={() => setSel(sel === iso ? null : iso)}>
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {sel && !picked && (
        <section className="day-log">
          <div className="day-log-head"><h2>{dateLabel(sel)}</h2></div>
          <p className="sub">이날은 운동 기록이 없어요.</p>
        </section>
      )}
      {picked && <DayLog l={picked} units={units} />}
      {sel && <button type="button" className="link" style={{ justifySelf: "center" }} onClick={() => setSel(null)}>전체 기록 보기</button>}

      {!sel && logs?.length === 0 && (
        <div className="empty">
          <p className="card-title">아직 기록이 없어요</p>
          <p className="sub">오늘 탭에서 세트를 완료하면 여기에 쌓여요.</p>
        </div>
      )}
      {!sel && logs?.map(l => <DayLog key={l.date} l={l} units={units} />)}
    </div>
  );
}
