import { useState } from "react";
import { ALTERNATIVES, EXERCISES, isExerciseId, type ExerciseId } from "../data/exercises";
import type { ExerciseLogRow } from "../lib/db";
import type { Feedback, LastLog } from "../lib/progress";
import { firstNumber, repsUnit, type RoutineItem } from "../lib/routine";

const FB: [Feedback, string][] = [["light", "가벼워요"], ["ok", "적당해요"], ["heavy", "무거워요"]];
const FB_KO: Record<Feedback, string> = { light: "가벼웠음", ok: "적당했음", heavy: "무거웠음" };

interface Props {
  no?: number;
  slot: string;
  item: RoutineItem;
  exId: string;
  log?: ExerciseLogRow;
  last?: LastLog;
  recKg: number | null;
  /** 같은 날 이미 하는 운동. 대체 후보에서 뺀다 */
  dayIds: string[];
  onSet: (setNo: number, kg: number | null, reps: number, done: boolean) => Promise<void>;
  onFeedback: (fb: Feedback) => Promise<void>;
  onSwap: (to: string) => void;
  onRest: (sec: number) => void;
}

type Row = { kg: number | null; reps: number };

const fmt = (n: number) => String(+n.toFixed(1));

export default function ExerciseCard({ no, slot, item, exId, log, last, recKg, dayIds, onSet, onFeedback, onSwap, onRest }: Props) {
  // 루틴은 저장 전에 검증되고 대체 목록도 카탈로그 id라서 exId는 항상 카탈로그에 있다
  const e = EXERCISES[exId as ExerciseId];
  const unit = repsUnit(item.reps);
  const repStep = unit === "회" ? 1 : 5;
  const kgStep = e.step ?? 2.5;
  const useKg = recKg !== null;

  const logged = [...(log?.set_logs ?? [])].sort((a, b) => a.set_no - b.set_no);
  const [rows, setRows] = useState<Row[]>(() => {
    const base = Array.from({ length: Math.max(item.sets, logged.length) }, (): Row => ({ kg: recKg, reps: firstNumber(item.reps) }));
    for (const s of logged) base[s.set_no - 1] = { kg: s.kg === null ? null : Number(s.kg), reps: s.reps };
    return base;
  });
  const [open, setOpen] = useState<"" | "how" | "alt">("");
  const [busy, setBusy] = useState(false);
  const done = new Set(logged.map(s => s.set_no));
  const allDone = rows.every((_, i) => done.has(i + 1));

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  function change(i: number, patch: Partial<Row>) {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
    setRows(next);
    const r = next[i]!;
    // 이미 완료한 세트를 고치면 바로 저장
    if (done.has(i + 1)) void act(() => onSet(i + 1, r.kg, r.reps, true));
  }

  function toggle(i: number) {
    const r = rows[i]!;
    const finishing = !done.has(i + 1);
    void act(() => onSet(i + 1, r.kg, r.reps, finishing));
    if (finishing && item.restSec > 0) onRest(item.restSec);
  }

  const alts = ALTERNATIVES[slot] ? [slot, ...ALTERNATIVES[slot]!].filter(a => a !== exId && (a === slot || !dayIds.includes(a))) : [];
  const kgLabel = exId !== slot ? (e.step ? "처음엔 가볍게" : "맨몸") : item.kg === null ? "맨몸" : `${e.unit ? `${e.unit} ` : ""}${fmt(item.kg)}kg`;
  const perLabel = e.per ? `${e.per} ` : "";
  const repsLabel = /^\d+(-\d+)?$/.test(item.reps) ? `${item.reps}회` : item.reps;
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(e.name.replace(/ \(.*\)/, "") + (e.kind === "cardio" ? " 하는 법" : " 자세"))}`;

  return (
    <article className={`ex${logged.length && allDone ? " done" : ""}`} id={`ex-${slot}`}>
      <div className="ex-head">
        {no !== undefined && <span className="ex-no">{allDone && logged.length ? "✓" : no}</span>}
        <div className="ex-title">
          <h3>{e.name}</h3>
          <div className="en">{e.en}{e.gear ? ` · ${e.gear}` : ""}</div>
          <p className="plan-line">{item.sets}세트 × {perLabel}{repsLabel} · {kgLabel}{item.restSec ? ` · 휴식 ${item.restSec}초` : ""}</p>
          {exId !== slot && isExerciseId(slot) && <p className="swapped">대체 중 · 원래 운동: {EXERCISES[slot].name}</p>}
        </div>
      </div>

      <figure className="fig" aria-label={`${e.name} 시작 자세와 끝 자세`}>
        <div className="f"><img src={`/img/${e.img}_0.webp`} alt={`${e.name} 시작 자세`} loading="lazy" width={600} height={400} /><span className="tag">① 시작</span></div>
        <div className="f f2"><img src={`/img/${e.img}_1.webp`} alt={`${e.name} 끝 자세`} loading="lazy" width={600} height={400} /><span className="tag">② 끝</span></div>
      </figure>

      <div className="log">
        {last && (
          <p className="hint">
            지난번 {last.kg === null ? "맨몸" : `${fmt(last.kg)}kg`}{last.feedback ? ` · ${FB_KO[last.feedback]}` : ""}
            {useKg && recKg !== last.kg ? ` → 오늘 ${fmt(recKg)}kg 추천` : ""}
          </p>
        )}
        {rows.map((r, i) => (
          <div className={`set${useKg ? "" : " no-kg"}`} key={i}>
            <span className="no">{i + 1}</span>
            {useKg && (
              <div className="step" aria-label={`${i + 1}세트 무게`}>
                <button type="button" aria-label="무게 내리기" onClick={() => change(i, { kg: Math.max(0, (r.kg ?? 0) - kgStep) })}>−</button>
                <span>{fmt(r.kg ?? 0)}kg</span>
                <button type="button" aria-label="무게 올리기" onClick={() => change(i, { kg: (r.kg ?? 0) + kgStep })}>+</button>
              </div>
            )}
            <div className="step" aria-label={`${i + 1}세트 ${unit === "회" ? "횟수" : "시간"}`}>
              <button type="button" aria-label="줄이기" onClick={() => change(i, { reps: Math.max(0, r.reps - repStep) })}>−</button>
              <span>{r.reps}{unit}</span>
              <button type="button" aria-label="늘리기" onClick={() => change(i, { reps: r.reps + repStep })}>+</button>
            </div>
            <button type="button" className="check" aria-pressed={done.has(i + 1)} disabled={busy} onClick={() => toggle(i)}>
              {done.has(i + 1) ? "완료" : "하기"}
            </button>
          </div>
        ))}
        <div className="log-foot">
          <button type="button" className="pill" onClick={() => setRows([...rows, { ...rows[rows.length - 1]! }])}>세트 추가</button>
          {rows.length > item.sets && !done.has(rows.length) && (
            <button type="button" className="pill" onClick={() => setRows(rows.slice(0, -1))}>마지막 세트 빼기</button>
          )}
        </div>
        {logged.length > 0 && (
          <>
            <p className="hint">오늘 무게 어땠나요? 다음 번 추천 무게에 반영됩니다.</p>
            <div className="fb" role="group" aria-label="체감">
              {FB.map(([k, label]) => (
                <button type="button" key={k} aria-pressed={log?.feedback === k} disabled={busy} onClick={() => void act(() => onFeedback(k))}>{label}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="row-btns">
        <button type="button" className="pill" aria-expanded={open === "how"} onClick={() => setOpen(open === "how" ? "" : "how")}>자세 설명</button>
        {alts.length > 0 && <button type="button" className="pill" aria-expanded={open === "alt"} onClick={() => setOpen(open === "alt" ? "" : "alt")}>대체 운동</button>}
      </div>

      {open === "alt" && (
        <div className="alts">
          <p>자리가 없으면 아래에서 골라 하세요.</p>
          {alts.map(a => isExerciseId(a) && (
            <button type="button" key={a} onClick={() => { setOpen(""); onSwap(a); }}>
              <b>{a === slot ? "원래대로: " : ""}{EXERCISES[a].name}</b>
              <small>{EXERCISES[a].gear ?? "원래 운동"}</small>
            </button>
          ))}
        </div>
      )}

      {open === "how" && (
        <div className="how">
          <div><h4>준비 자세</h4><ul>{e.setup.map(s => <li key={s}>{s}</li>)}</ul></div>
          <div><h4>동작 순서</h4><ol>{e.steps.map(s => <li key={s}>{s}</li>)}</ol></div>
          <div><h4>{e.kind === "cardio" ? "강도 맞추기" : "호흡"}</h4><p>{e.breath}</p></div>
          <div className="bad"><h4>이러면 안 돼요</h4><ul>{e.bad.map(s => <li key={s}>{s}</li>)}</ul></div>
          <p className="tip"><b>팁</b> {e.tip}</p>
          {e.note && <p className="hint">{e.note}</p>}
          <a className="yt" href={yt} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.8 31 31 0 0 0-.4-4.8zM9.7 15.1V8.9l5.8 3.1z" /></svg>
            유튜브에서 {e.kind === "cardio" ? "사용법" : "자세"} 영상 보기
          </a>
        </div>
      )}
    </article>
  );
}
