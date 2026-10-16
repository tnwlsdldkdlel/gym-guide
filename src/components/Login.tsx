import { useState } from "react";
import { supabase } from "../lib/db";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message === "Invalid login credentials" ? "이메일이나 비밀번호가 맞지 않습니다." : /email address .* is invalid/i.test(error.message) ? "사용할 수 없는 이메일 주소입니다. 실제로 쓰는 메일 주소를 넣으세요." : error.message);
    else if (mode === "up" && !data.session) setMsg("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.");
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{mode === "in" ? "로그인" : "계정 만들기"}</h2>
      <p className="muted">운동 기록은 계정마다 따로 저장됩니다. 남편과 각자 계정을 만드세요.</p>
      <label>이메일<input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>비밀번호 (6자 이상)<input id="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {msg && <p className={msg.startsWith("가입 확인") ? "muted" : "err"} role="status">{msg}</p>}
      <button className="primary" disabled={busy}>{mode === "in" ? "로그인" : "가입하기"}</button>
      <button type="button" className="ghost" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
        {mode === "in" ? "처음이면 계정 만들기" : "이미 계정이 있으면 로그인"}
      </button>
    </form>
  );
}
