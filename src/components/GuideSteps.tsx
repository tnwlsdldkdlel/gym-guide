import { useRef, useState } from "react";
import type { Exercise } from "../data/exercises";

type Page = { kicker: string; text?: string; list?: string[]; bad?: boolean; yt?: boolean };

function pages(e: Exercise): Page[] {
  return [
    ...e.setup.map((t, i) => ({ kicker: `준비 자세 ${i + 1}/${e.setup.length}`, text: t })),
    ...e.steps.map((t, i) => ({ kicker: `동작 ${i + 1}/${e.steps.length}`, text: t })),
    { kicker: e.kind === "cardio" ? "강도 맞추기" : "호흡", text: e.breath },
    { kicker: "이러면 안 돼요", list: e.bad, bad: true },
    { kicker: "팁", text: e.tip + (e.note ? ` (${e.note})` : ""), yt: true },
  ];
}

/** 자세 설명을 한 장씩 넘겨 본다. 좌우 스와이프도 된다 */
export default function GuideSteps({ exercise, onDone }: { exercise: Exercise; onDone: () => void }) {
  const list = pages(exercise);
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const p = list[i]!;
  const go = (n: number) => setI(Math.min(list.length - 1, Math.max(0, n)));
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name.replace(/ \(.*\)/, "") + (exercise.kind === "cardio" ? " 하는 법" : " 자세"))}`;

  return (
    <>
      <div
        className={`step-card${p.bad ? " bad" : ""}`}
        aria-live="polite"
        onTouchStart={e => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={e => {
          const dx = (e.changedTouches[0]?.clientX ?? 0) - (touchX.current ?? 0);
          if (touchX.current !== null && Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <span className="kicker">{p.kicker}</span>
        {p.text && <p>{p.text}</p>}
        {p.list && <ul>{p.list.map(t => <li key={t}>{t}</li>)}</ul>}
        {p.yt && (
          <a className="yt" href={yt} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.8 31 31 0 0 0-.4-4.8zM9.7 15.1V8.9l5.8 3.1z" /></svg>
            유튜브에서 영상 보기
          </a>
        )}
      </div>
      <div className="dots" aria-hidden="true">{list.map((_, n) => <span key={n} className={n === i ? "on" : ""} />)}</div>
      <div className="row-gap">
        <button type="button" className="btn secondary" disabled={i === 0} onClick={() => go(i - 1)}>이전</button>
        <button type="button" className="btn primary" onClick={() => (i === list.length - 1 ? onDone() : go(i + 1))}>
          {i === list.length - 1 ? "다 봤어요" : "다음"}
        </button>
      </div>
    </>
  );
}
