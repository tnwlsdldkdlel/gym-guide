import { useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { toISO } from "../lib/dates";
import { getHistory, saveRoutine, supabase, toSummaries, type Profile, type RoutineRow } from "../lib/db";
import { buildAiPrompt, CORE_DAILY, dayOrder, extractJson, forGender, planText, removeItem, validateRoutine, type Routine, type StoredRoutine } from "../lib/routine";
import Sheet from "./Sheet";
import { dayColor } from "./Today";

const name = (id: string) => (isExerciseId(id) ? EXERCISES[id].name : id);

type Remove = (day: string | null, index: number) => void;

function RemoveBtn({ id, last, onRemove }: { id: string; last: boolean; onRemove: () => void }) {
  return <button type="button" className="rm" aria-label={`${name(id)} 빼기`} disabled={last} onClick={onRemove}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>;
}

/** onRemove가 있으면(편집 중) 운동마다 빼기 버튼을 단다 */
function Summary({ routine, onRemove }: { routine: Routine; onRemove?: Remove }) {
  return (
    <>
      {dayOrder(routine).map(k => [k, routine.days[k]!] as const).filter(([, d]) => d.items.length).map(([k, d]) => (
        <section className="list-card" key={k} style={{ "--dc": dayColor(k) } as React.CSSProperties}>
          <h3><i className="dot" />{d.title}{d.pickOne && <span className="badge">하나 골라요</span>}</h3>
          <ul>{d.items.map((i, n) => <li key={n}><span>{name(i.id)}</span><span className="r">{planText(i)}</span>{onRemove && <RemoveBtn id={i.id} last={d.items.length <= 1} onRemove={() => onRemove(k, n)} />}</li>)}</ul>
        </section>
      ))}
      <section className="list-card">
        <h3><i className="dot" />복근<span className="badge">{routine.core.length > CORE_DAILY ? `하루 ${CORE_DAILY}개씩 돌아가며` : "쉬는 날 빼고 매일"}</span></h3>
        <ul>{routine.core.map((i, n) => <li key={n}><span>{name(i.id)}</span><span className="r">{planText(i)}</span>{onRemove && <RemoveBtn id={i.id} last={routine.core.length <= CORE_DAILY} onRemove={() => onRemove(null, n)} />}</li>)}</ul>
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
  // 빼기 직전 루틴. 되돌리기는 이걸 새 루틴으로 다시 저장한다
  const [undo, setUndo] = useState<StoredRoutine | null>(null);
  const [removeMsg, setRemoveMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // 빼기 버튼은 편집 중에만 보여서 잘못 누르는 일을 줄인다
  const [editing, setEditing] = useState(false);

  async function remove(day: string | null, index: number) {
    const next = removeItem(routine.data, day, index);
    if (!next || busy) return;
    const id = (day === null ? routine.data.core : routine.data.days[day]!.items)[index]!.id;
    setBusy(true);
    try {
      const prev = routine.data;
      onSaved(await saveRoutine(next));
      setUndo(prev); setRemoveMsg(`루틴에서 ${name(id)} 뺐어요.`);
    } catch (e) { console.error(e); setUndo(null); setRemoveMsg("저장하지 못했어요. 잠시 후 다시 눌러 주세요."); }
    finally { setBusy(false); }
  }

  async function restore() {
    if (!undo || busy) return;
    setBusy(true);
    try { onSaved(await saveRoutine(undo)); setUndo(null); setRemoveMsg("되돌렸어요."); }
    catch (e) { console.error(e); setRemoveMsg("되돌리지 못했어요. 잠시 후 다시 눌러 주세요."); }
    finally { setBusy(false); }
  }

  async function copyPrompt() {
    setCopyMsg("최근 기록을 모으는 중…");
    try {
      const logs = toSummaries(await getHistory(14)).reverse();
      const p = buildAiPrompt({ gender: profile.gender, startDate: profile.start_date, today: toISO(new Date()), routine: routine.data, logs });
      setPrompt(p);
      try { await navigator.clipboard.writeText(p); setCopyMsg("복사했어요. Claude나 ChatGPT에 붙여 넣어 주세요."); }
      catch { setCopyMsg("자동 복사가 막혀 있어요. 질문 칸 오른쪽 위 복사 버튼을 눌러 주세요."); }
    } catch (e) { console.error(e); setCopyMsg("기록을 불러오지 못했어요. 잠시 후 다시 눌러 주세요."); }
  }

  // 기록을 불러오느라 첫 클릭의 사용자 제스처가 끊기면(iOS Safari) 자동 복사가 막혀서, 만든 질문을 바로 복사하는 버튼을 따로 둔다
  async function copyAgain() {
    try { await navigator.clipboard.writeText(prompt); setCopyMsg("복사했어요. Claude나 ChatGPT에 붙여 넣어 주세요."); }
    catch { setCopyMsg("복사가 막혀 있어요. 아래 칸을 길게 눌러 전체 선택한 뒤 복사해 주세요."); }
  }

  function check() {
    try { setResult(validateRoutine(extractJson(text))); }
    catch { setResult({ ok: false, errors: ["JSON을 읽을 수 없어요. AI 답에서 { 부터 } 까지 빠짐없이 붙여 넣었는지 확인해 주세요."] }); }
  }

  async function save() {
    if (!result?.ok) return;
    try {
      onSaved(await saveRoutine(result.routine));
      setText(""); setResult(null); setPasteOpen(false); setUndo(null); setRemoveMsg("");
      setMsg("새 루틴을 저장했어요. 오늘 탭에 바로 반영돼요.");
    } catch (e) { console.error(e); setResult({ ok: false, errors: ["저장하지 못했어요. 잠시 후 다시 눌러 주세요."] }); }
  }

  return (
    <div className="screen">
      <h1 className="title">루틴</h1>
      {msg && <p className="hint" role="status">{msg}</p>}

      <section className="sec">
        <div className="sec-head">
          <h2>지금 루틴 <small>{new Date(routine.created_at).getMonth() + 1}월 {new Date(routine.created_at).getDate()}일 저장</small></h2>
          <button type="button" className="link" onClick={() => setEditing(!editing)}>{editing ? "완료" : "운동 빼기"}</button>
        </div>
        {removeMsg && <p className="hint" role="status">{removeMsg}{undo && <> <button type="button" className="link" onClick={restore}>되돌리기</button></>}</p>}
        <Summary routine={forGender(routine.data, profile.gender)} onRemove={editing ? remove : undefined} />
      </section>

      <hr className="band" />

      <section className="sec">
        <div className="sec-head"><h2>AI와 루틴 바꾸기</h2></div>
        <p className="sub">최근 2주 기록을 AI에게 보여 주고, 무게를 늘릴지 유지할지 정한 새 루틴을 받아 붙여 넣어요.</p>
        <button type="button" className="btn primary" onClick={copyPrompt}>1. AI에게 물어볼 내용 복사</button>
        {copyMsg && <p className="hint" role="status">{copyMsg}</p>}
        {prompt && (
          <div className="copy-box">
            <textarea id="prompt" readOnly value={prompt} onFocus={e => e.currentTarget.select()} aria-label="AI에게 보낼 질문" />
            <button type="button" className="icon-btn" aria-label="질문 복사" onClick={copyAgain}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
            </button>
          </div>
        )}
        <button type="button" className="btn secondary" onClick={() => setPasteOpen(true)}>2. AI 답 붙여넣기</button>
      </section>

      <hr className="band" />

      <section className="account" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span className="sub" style={{ fontSize: "var(--fs-md)", minWidth: 0 }}>{email}</span>
        <button type="button" className="btn small secondary" onClick={() => supabase.auth.signOut()}>로그아웃</button>
      </section>
      <footer><p>운동 사진: free-exercise-db (퍼블릭 도메인). 통증이 날카롭거나 관절이 아프면 그 운동은 멈추고 트레이너에게 자세를 확인받아 주세요.</p></footer>

      <Sheet open={pasteOpen} onClose={() => setPasteOpen(false)} title="AI 답 붙여넣기">
        <p className="hint">AI 답을 통째로 붙여 넣어도 JSON 부분만 골라 확인해요.</p>
        <textarea id="routine-json" value={text} onChange={e => { setText(e.target.value); setResult(null); }} aria-label="새 루틴 JSON" />
        {result && !result.ok && <ul className="err" style={{ margin: 0, paddingLeft: "1.2em" }}>{result.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        {result?.ok ? (
          <>
            {result.routine.note && <p><b>AI 메모</b> {result.routine.note}</p>}
            <p className="hint">평일엔 {result.routine.weekdayCycle.map(k => result.routine.days[k]?.title ?? k).join(", ")} 순서로 돌아가요. 토요일은 {result.routine.days[result.routine.saturday]?.title}, 일요일은 {result.routine.days[result.routine.sunday]?.title}.</p>
            <Summary routine={forGender(result.routine, profile.gender)} />
            <button type="button" className="btn primary" onClick={save}>이 루틴으로 저장</button>
          </>
        ) : (
          <button type="button" className="btn primary" disabled={!text.trim()} onClick={check}>루틴 확인하기</button>
        )}
      </Sheet>
    </div>
  );
}
