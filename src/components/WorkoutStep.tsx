import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ALTERNATIVES, EXERCISES, isExerciseId, type ExerciseId } from "../data/exercises";
import type { ExerciseLogRow } from "../lib/db";
import type { Feedback, LastLog } from "../lib/progress";
import { repsUnit, type RoutineItem } from "../lib/routine";
import BodyMap from "./BodyMap";
import GuideSteps from "./GuideSteps";
import Sheet from "./Sheet";

const FB: [Feedback, string][] = [["light", "가벼워요"], ["ok", "적당해요"], ["heavy", "무거워요"]];
const FB_KO: Record<Feedback, string> = { light: "가벼웠어요", ok: "적당했어요", heavy: "무거웠어요" };

export interface StepProps {
  slot: string;
  item: RoutineItem;
  exId: string;
  log?: ExerciseLogRow;
  last?: LastLog;
  recKg: number | null;
  /** 미리 채울 횟수. 지난번에 늘렸으면 그 값 */
  recReps: number;
  /** 같은 날 이미 하는 운동. 대체 후보에서 뺀다 */
  dayIds: string[];
  onSet: (setNo: number, kg: number | null, reps: number, done: boolean) => Promise<void>;
  onFeedback: (fb: Feedback) => Promise<void>;
  onSwap: (to: string) => void;
  onRest: (sec: number) => void;
}

type Row = { kg: number | null; reps: number };
const fmt = (n: number) => String(+n.toFixed(1));

export default function WorkoutStep({ slot, item, exId, log, last, recKg, recReps, dayIds, onSet, onFeedback, onSwap, onRest }: StepProps) {
  // 루틴은 저장 전에 검증되고 대체 목록도 카탈로그 id라서 exId는 항상 카탈로그에 있다
  const e = EXERCISES[exId as ExerciseId];
  const unit = repsUnit(item.reps);
  const repStep = unit === "회" ? 1 : 5;
  const kgStep = e.step ?? 2.5;
  const useKg = recKg !== null;

  const logged = [...(log?.set_logs ?? [])].sort((a, b) => a.set_no - b.set_no);
  const [rows, setRows] = useState<Row[]>(() => {
    const base = Array.from({ length: Math.max(item.sets, logged.length) }, (): Row => ({ kg: recKg, reps: recReps }));
    for (const s of logged) base[s.set_no - 1] = { kg: s.kg === null ? null : Number(s.kg), reps: s.reps };
    return base;
  });
  const [sheet, setSheet] = useState<"" | "guide" | "alt">("");
  const [busy, setBusy] = useState(false);
  // 펼쳐 볼 세트. null이면 아직 안 한 첫 세트를 펼친다
  const [open, setOpen] = useState<number | null>(null);
  const done = new Set(logged.map(s => s.set_no));
  const cur = rows.findIndex((_, i) => !done.has(i + 1));
  const shown = open ?? cur;
  const allDone = cur < 0;

  // 펼친 세트 카드는 한 줄 높이(52px)에서 스르륵 펴지고, 접을 때는 다시 한 줄 높이로 줄어든 뒤 바뀐다
  const cardRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const el = cardRef.current;
    if (!el || still()) return;
    el.style.overflow = "hidden";
    el.animate([{ height: "52px", opacity: 0.6 }, { height: `${el.offsetHeight}px`, opacity: 1 }], { duration: 240, easing: "cubic-bezier(.22, 1, .36, 1)" })
      .onfinish = () => { el.style.overflow = ""; };
  }, [shown]);
  function openSet(next: number | null) {
    const el = cardRef.current;
    if (!el || still()) { setOpen(next); return; }
    el.style.overflow = "hidden";
    const a = el.animate([{ height: `${el.offsetHeight}px` }, { height: "52px", opacity: 0.6 }], { duration: 180, easing: "ease-in", fill: "forwards" });
    // 끝나면 바로 바꿔 그린 뒤 애니메이션을 지운다(같은 카드가 남아도 높이가 고정되지 않게). 창이 뒤에 있으면 finish 이벤트가 늦어서 타이머로 처리
    setTimeout(() => { flushSync(() => setOpen(next)); a.cancel(); el.style.overflow = ""; }, 180);
  }

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
    setOpen(null);
    void act(() => onSet(i + 1, r.kg, r.reps, finishing));
    if (finishing && item.restSec > 0) onRest(item.restSec);
  }

  // 초 단위 세트(플랭크 등)는 카운트다운이 끝나면 진동 후 그 세트를 자동 완료한다
  const [timer, setTimer] = useState<{ i: number; end: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timer]);
  const left = timer ? Math.max(0, Math.ceil((timer.end - now) / 1000)) : 0;
  useEffect(() => {
    if (!timer || left > 0) return;
    navigator.vibrate?.([300, 100, 300]);
    setTimer(null);
    toggle(timer.i);
  }, [left, timer]);
  const startTimer = (i: number) => { setNow(Date.now()); setTimer({ i, end: Date.now() + rows[i]!.reps * 1000 }); };

  const alts = ALTERNATIVES[slot] ? [slot, ...ALTERNATIVES[slot]!].filter(a => a !== exId && (a === slot || !dayIds.includes(a))) : [];
  const swapped = exId !== slot && isExerciseId(slot);
  const kgLabel = swapped ? (e.step ? "가볍게" : "맨몸") : item.kg === null ? "맨몸" : `${e.unit ? `${e.unit} ` : ""}${fmt(item.kg)}kg`;
  const repsLabel = /^\d+(-\d+)?$/.test(item.reps) ? `${item.reps}회` : item.reps;
  const kgPhrase = kgLabel === "맨몸" ? "" : kgLabel === "가볍게" ? "가볍게 " : `${kgLabel}으로 `;

  const amount = (r: Row) => `${useKg ? `${fmt(r.kg ?? 0)}kg × ` : ""}${r.reps}${unit}`;

  return (
    <>
      <div className="ex-info">
        <div>
          {swapped && <p className="swapped">{EXERCISES[slot as ExerciseId].name} 대신 하는 중</p>}
          <h2>{e.name}</h2>
          <p className="ex-sum">{kgPhrase}{e.per ? `${e.per} ` : ""}{repsLabel}{item.sets > 1 ? `씩 ${item.sets}세트` : ""}{item.restSec ? `, 쉬는 시간 ${item.restSec}초` : ""}</p>
          <p className="muscles"><b>{e.muscles[0]}</b>{e.muscles.length > 1 ? `, ${e.muscles.slice(1).join(", ")}` : ""}</p>
          <p className="en">{[e.en, e.gear].filter(Boolean).join(", ")}</p>
        </div>
        <BodyMap muscles={e.muscles} />
      </div>

      <figure className="fig" aria-label={`${e.name} 시작 자세와 끝 자세`}>
        <div className="f"><img src={`/img/${e.img}_0.webp`} alt={`${e.name} 시작 자세`} width={600} height={400} /><span className="tag">① 시작</span></div>
        <div className="f f2"><img src={`/img/${e.img}_1.webp`} alt={`${e.name} 끝 자세`} width={600} height={400} /><span className="tag">② 끝</span></div>
      </figure>

      <div className="links">
        <button type="button" className="link" onClick={() => setSheet("guide")}>자세 단계별로 보기</button>
        {alts.length > 0 && <button type="button" className="link" onClick={() => setSheet("alt")}>자리가 없으면 다른 운동으로</button>}
      </div>

      {last && (
        <p className="hint">
          지난번 {last.kg === null ? "맨몸" : `${fmt(last.kg)}kg`}{last.feedback ? `, ${FB_KO[last.feedback]}` : ""}
          {useKg && recKg !== last.kg ? `. 오늘은 ${fmt(recKg)}kg을 추천해요` : ""}
        </p>
      )}

      <div className="sets">
        {rows.map((r, i) => {
          const isDone = done.has(i + 1);
          if (i !== shown) return (
            <button type="button" className={`set-line${isDone ? " done" : ""}`} key={i} onClick={() => openSet(i)}>
              <span className="set-no" aria-hidden="true">{isDone ? "✓" : i + 1}</span>
              <span>{i + 1}세트{isDone ? " 완료" : ""}</span>
              <b>{amount(r)}</b>
              <span className="edit">{isDone ? "수정" : "열기"}</span>
            </button>
          );
          return (
            <div className={`set-card${isDone ? " done" : ""}`} key={i} ref={cardRef}>
              <div className="set-card-head">
                <span>{i === cur ? `지금 ${i + 1}세트` : `${i + 1}세트${isDone ? " 완료" : ""}`}</span>
                {open !== null && <button type="button" className="link" onClick={() => openSet(null)}>접기</button>}
              </div>
              <div className="set-steppers">
                {useKg && (
                  <div className="stepper">
                    <button type="button" aria-label={`${i + 1}세트 무게 내리기`} onClick={() => change(i, { kg: Math.max(0, (r.kg ?? 0) - kgStep) })}>−</button>
                    <span>{fmt(r.kg ?? 0)}kg</span>
                    <button type="button" aria-label={`${i + 1}세트 무게 올리기`} onClick={() => change(i, { kg: (r.kg ?? 0) + kgStep })}>+</button>
                  </div>
                )}
                <div className="stepper">
                  <button type="button" aria-label={`${i + 1}세트 줄이기`} onClick={() => change(i, { reps: Math.max(0, r.reps - repStep) })}>−</button>
                  <span>{r.reps}{unit}</span>
                  <button type="button" aria-label={`${i + 1}세트 늘리기`} onClick={() => change(i, { reps: r.reps + repStep })}>+</button>
                </div>
              </div>
              {timer?.i === i ? (
                <div className="countdown" role="timer" aria-live="off">
                  <b>{left}초</b>
                  <button type="button" className="btn small secondary" onClick={() => setTimer(null)}>그만</button>
                  <button type="button" className="btn small secondary" onClick={() => { setTimer(null); toggle(i); }}>바로 완료</button>
                </div>
              ) : !isDone && unit === "초" ? (
                <div className="set-actions">
                  <button type="button" className="btn go" disabled={busy} onClick={() => startTimer(i)}>{r.reps}초 시작</button>
                  <button type="button" className="btn secondary" disabled={busy} onClick={() => toggle(i)}>완료</button>
                </div>
              ) : (
                <button type="button" className={`btn ${isDone ? "secondary" : "go"}`} aria-pressed={isDone} disabled={busy} onClick={() => toggle(i)}>
                  {isDone ? "완료 취소" : `${i + 1}세트 완료`}
                </button>
              )}
            </div>
          );
        })}
        <div className="row-gap">
          <button type="button" className="btn small secondary" onClick={() => setRows([...rows, { ...rows[rows.length - 1]! }])}>+ 세트 추가</button>
          {rows.length > item.sets && !done.has(rows.length) && (
            <button type="button" className="btn small secondary" onClick={() => setRows(rows.slice(0, -1))}>마지막 세트 빼기</button>
          )}
        </div>
      </div>

      {allDone && (
        <div className="card tight" style={{ display: "grid", gap: 10 }}>
          <p className="card-title">오늘 무게 어땠어요?</p>
          <div className="fb" role="group" aria-label="체감">
            {FB.map(([k, label]) => (
              <button type="button" key={k} aria-pressed={log?.feedback === k} disabled={busy} onClick={() => void act(() => onFeedback(k))}>{label}</button>
            ))}
          </div>
          <p className="hint">다음 번 추천 무게에 반영돼요.</p>
        </div>
      )}

      <Sheet open={sheet === "guide"} onClose={() => setSheet("")} title={`${e.name} 자세`}>
        <GuideSteps exercise={e} onDone={() => setSheet("")} />
      </Sheet>

      <Sheet open={sheet === "alt"} onClose={() => setSheet("")} title="대체 운동 고르기">
        <p className="hint">기구 자리가 없으면 비슷한 부위를 쓰는 운동으로 바꿔서 해요.</p>
        {alts.map(a => isExerciseId(a) && (
          <button type="button" className="alt-opt" key={a} onClick={() => { setSheet(""); onSwap(a); }}>
            <img src={`/img/${EXERCISES[a].img}_0.webp`} alt="" width={56} height={56} />
            <span><b>{a === slot ? "원래대로: " : ""}{EXERCISES[a].name}</b><small>{EXERCISES[a].gear ?? "원래 운동"}</small></span>
          </button>
        ))}
      </Sheet>
    </>
  );
}
