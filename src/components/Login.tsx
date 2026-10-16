import { useState } from "react";
import { authStorage, supabase } from "../lib/db";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(authStorage.savedEmail);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(authStorage.remembered);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "in") authStorage.setRemember(remember, email);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message === "Invalid login credentials" ? "이메일이나 비밀번호가 맞지 않아요." : /email address .* is invalid/i.test(error.message) ? "사용할 수 없는 이메일 주소예요. 실제로 쓰는 메일 주소를 넣어 주세요." : error.message);
    else if (mode === "up" && !data.session) setMsg("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
  }

  return (
    <form className="login" onSubmit={submit}>
      <header className="brand">
        <div className="plates" aria-hidden="true"><span /><span /><span /><span /></div>
        <h1>{mode === "in" ? "오늘의 루틴" : "계정 만들기"}</h1>
        <p className="sub">{mode === "in" ? "오늘 할 운동을 하나씩 알려 드려요" : "운동 기록은 계정마다 따로 저장돼요. 한 사람당 계정 하나씩 만들어 주세요."}</p>
      </header>
      <div className="form">
        <label>이메일<input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>{mode === "in" ? "비밀번호" : "비밀번호 (6자 이상)"}
          <span className="pw">
            <input id="password" type={showPw ? "text" : "password"} autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="pw-toggle" aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"} onClick={() => setShowPw(!showPw)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {showPw
                  ? <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
                  : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </span>
        </label>
        {mode === "in" && <label className="remember"><input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />로그인 정보 기억하기</label>}
        {msg && <p className={msg.startsWith("가입 확인") ? "hint" : "err"} role="status">{msg}</p>}
        <button className="btn primary" disabled={busy}>{mode === "in" ? "로그인" : "가입하기"}</button>
        <p className="switch">
          {mode === "in" ? "계정이 없나요?" : "이미 계정이 있나요?"}{" "}
          <button type="button" className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>{mode === "in" ? "가입하기" : "로그인"}</button>
        </p>
      </div>
    </form>
  );
}
