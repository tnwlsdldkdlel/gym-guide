import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DEFAULT_ROUTINES } from "./data/defaultRoutines";
import { configured, getActiveRoutine, getProfile, saveProfile, saveRoutine, supabase, type Profile, type RoutineRow } from "./lib/db";
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import Today from "./components/Today";
import History from "./components/History";
import RoutinePage from "./components/RoutinePage";

type Page = "today" | "history" | "routine";
const PAGES: [Page, string][] = [["today", "오늘"], ["history", "기록"], ["routine", "루틴"]];

export default function App() {
  const [auth, setAuth] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [routine, setRoutine] = useState<RoutineRow | null>(null);
  const [page, setPage] = useState<Page>("today");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setAuth(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = auth?.user.id;
  useEffect(() => {
    if (!userId) { setProfile(undefined); setRoutine(null); return; }
    Promise.all([getProfile(), getActiveRoutine()])
      .then(([p, r]) => { setProfile(p); setRoutine(r); })
      .catch((e: Error) => setError(e.message));
  }, [userId]);

  async function finishOnboarding(p: { gender: "m" | "f"; start_date: string }) {
    await saveProfile(p);
    const r = routine ?? (await saveRoutine(DEFAULT_ROUTINES[p.gender]));
    setRoutine(r);
    setProfile(await getProfile());
  }

  if (!configured) return <Shell><div className="panel"><h2>Supabase 연결이 필요합니다</h2><p>.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 다시 실행하세요. .env.example을 참고하세요.</p></div></Shell>;
  if (auth === undefined) return <Shell><p className="muted">불러오는 중…</p></Shell>;
  if (!auth) return <Shell><Login /></Shell>;
  if (error) return <Shell><p className="err">불러오지 못했습니다: {error}</p></Shell>;
  if (profile === undefined) return <Shell><p className="muted">불러오는 중…</p></Shell>;
  if (!profile || !routine) return <Shell><Onboarding onDone={finishOnboarding} /></Shell>;

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <h1>첫 헬스장 루틴</h1>
            <nav className="nav" aria-label="메뉴">
              {PAGES.map(([k, label]) => (
                <button key={k} aria-current={page === k ? "page" : undefined} onClick={() => { setPage(k); window.scrollTo({ top: 0 }); }}>{label}</button>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="wrap">
        {page === "today" && <Today profile={profile} routine={routine} />}
        {page === "history" && <History />}
        {page === "routine" && <RoutinePage profile={profile} routine={routine} onSaved={setRoutine} />}
        <footer>
          {auth.user.email} · <button className="ghost" style={{ padding: "2px 10px" }} onClick={() => supabase.auth.signOut()}>로그아웃</button>
          <p>운동 사진: free-exercise-db (퍼블릭 도메인). 통증이 날카롭거나 관절이 아프면 그 운동은 멈추고 트레이너에게 자세를 확인받으세요.</p>
        </footer>
      </main>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="top"><div className="wrap"><div className="brand"><h1>첫 헬스장 루틴</h1></div></div></header>
      <main className="wrap">{children}</main>
    </>
  );
}
