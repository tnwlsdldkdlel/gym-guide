import { useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { toISO } from "../lib/dates";
import { getHistory, saveRoutine, supabase, toSummaries, type Profile, type RoutineRow } from "../lib/db";
import { buildAiPrompt, dayOrder, extractJson, validateRoutine, type Routine } from "../lib/routine";
import Sheet from "./Sheet";

const name = (id: string) => (isExerciseId(id) ? EXERCISES[id].name : id);

function Summary({ routine }: { routine: Routine }) {
  return (
    <>
      <p className="hint">평일: {routine.weekdayCycle.map(k => routine.days[k]?.title ?? k).join(" → ")} 반복 · 토 {routine.days[routine.saturday]?.title} · 일 {routine.days[routine.sunday]?.title}</p>
      {dayOrder(routine).map(k => [k, routine.days[k]!] as const).filter(([, d]) => d.items.length).map(([k, d]) => (
        <section className="list-card" key={k}>
          <h3>{d.title}{d.pickOne && <span className="badge">하나 골라서</span>}</h3>
          <ul>{d.items.map((i, n) => <li key={n}><span>{name(i.id)}</span><span className="r">{i.sets}×{i.reps}{i.kg === null ? "" : ` · ${i.kg}kg`}</span></li>)}</ul>
        </section>
      ))}
      <section className="list-card">
        <h3>복근 (매일)</h3>
        <ul>{routine.core.map((i, n) => <li key={n}><span>{name(i.id)}</span><span className="r">{i.sets}×{i.reps}</span></li>)}</ul>
      </section>
    </>
  );
}

export default function RoutinePage({ profile, routine, onSaved, email }: { profile: Profile; routine: RoutineRow; onSaved: (r: RoutineRow) => void; email: string }) {
  const [prompt, setPrompt] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof validateRoutine> | null>(null);
  const [msg, setMsg] = useState("");

  async function copyPrompt() {
    setCopyMsg("최근 기록을 모으는 중…");
    try {
      const logs = toSummaries(await getHistory(14)).reverse();
      const p = buildAiPrompt({ gender: profile.gender, startDate: profile.start_date, today: toISO(new Date()), routine: routine.data, logs });
      setPrompt(p);
      try { await navigator.clipboard.writeText(p); setCopyMsg("복사했습니다. Claude나 ChatGPT에 붙여 넣으세요."); }
      catch { setCopyMsg("자동 복사가 막혀 있습니다. 아래 칸을 길게 눌러 전체 선택 후 복사하세요."); }
    } catch (e) { setCopyMsg(`기록을 불러오지 못했습니다: ${(e as Error).message}`); }
  }

  function check() {
    try { setResult(validateRoutine(extractJson(text))); }
    catch { setResult({ ok: false, errors: ["JSON을 읽을 수 없습니다. AI 답에서 { 부터 } 까지 빠짐없이 붙여 넣었는지 확인하세요."] }); }
  }

  async function save() {
    if (!result?.ok) return;
    try {
      onSaved(await saveRoutine(result.routine));
      setText(""); setResult(null); setPasteOpen(false);
      setMsg("새 루틴을 저장했습니다. 오늘 탭에 바로 반영됩니다.");
    } catch (e) { setResult({ ok: false, errors: [`저장하지 못했습니다: ${(e as Error).message}`] }); }
  }

  return (
    <div className="screen">
      <h1 className="title">루틴</h1>
      {msg && <p className="hint" role="status">{msg}</p>}

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h3 style={{ fontWeight: 800 }}>AI와 루틴 바꾸기</h3>
        <p className="sub">최근 2주 기록을 AI에게 보여 주고, 무게를 늘릴지 유지할지 정한 새 루틴을 받아 붙여 넣습니다.</p>
        <button type="button" className="btn primary" onClick={copyPrompt}>1. AI에게 물어볼 내용 복사</button>
        {copyMsg && <p className="hint" role="status">{copyMsg}</p>}
        {prompt && <textarea id="prompt" readOnly value={prompt} onFocus={e => e.currentTarget.select()} aria-label="AI에게 보낼 질문" />}
        <button type="button" className="btn secondary" onClick={() => setPasteOpen(true)}>2. AI 답 붙여넣기</button>
      </section>

      <div className="section-label"><span>지금 루틴</span><span>{routine.created_at.slice(0, 10)} 저장</span></div>
      {routine.data.note && <p className="hint">메모: {routine.data.note}</p>}
      <Summary routine={routine.data} />

      <section className="card tight" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span className="sub" style={{ fontSize: ".9rem", minWidth: 0 }}>{email}</span>
        <button type="button" className="btn small secondary" onClick={() => supabase.auth.signOut()}>로그아웃</button>
      </section>
      <footer><p>운동 사진: free-exercise-db (퍼블릭 도메인). 통증이 날카롭거나 관절이 아프면 그 운동은 멈추고 트레이너에게 자세를 확인받으세요.</p></footer>

      <Sheet open={pasteOpen} onClose={() => setPasteOpen(false)} title="AI 답 붙여넣기">
        <p className="hint">AI 답을 통째로 붙여 넣어도 JSON 부분만 골라 검사합니다.</p>
        <textarea id="routine-json" value={text} onChange={e => { setText(e.target.value); setResult(null); }} aria-label="새 루틴 JSON" />
        {result && !result.ok && <ul className="err" style={{ margin: 0, paddingLeft: "1.2em" }}>{result.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        {result?.ok ? (
          <>
            {result.routine.note && <p><b>AI 메모</b> {result.routine.note}</p>}
            <Summary routine={result.routine} />
            <button type="button" className="btn primary" onClick={save}>이 루틴으로 저장</button>
          </>
        ) : (
          <button type="button" className="btn primary" disabled={!text.trim()} onClick={check}>검사하기</button>
        )}
      </Sheet>
    </div>
  );
}
