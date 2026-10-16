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
const TABS: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: "today", label: "오늘", icon: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /> },
  { key: "history", label: "기록", icon: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M16 3v4M8 3v4M4 11h16" /></> },
  { key: "routine", label: "루틴", icon: <><path d="M9 5h10M9 12h10M9 19h10" /><circle cx="5" cy="5" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="19" r="1" /></> },
];

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

  const plain = (children: React.ReactNode) => <div className="screen plain">{children}</div>;
  if (!configured) return plain(<div className="card"><h2 className="title">Supabase 연결이 필요합니다</h2><p className="sub">.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 다시 실행하세요.</p></div>);
  if (auth === undefined) return plain(<p className="muted">불러오는 중…</p>);
  if (!auth) return plain(<Login />);
  if (error) return plain(<p className="err">불러오지 못했습니다: {error}</p>);
  if (profile === undefined) return plain(<p className="muted">불러오는 중…</p>);
  if (!profile || !routine) return plain(<Onboarding onDone={finishOnboarding} />);

  return (
    <>
      {page === "today" && <Today profile={profile} routine={routine} />}
      {page === "history" && <History />}
      {page === "routine" && <RoutinePage profile={profile} routine={routine} onSaved={setRoutine} email={auth.user.email ?? ""} />}
      <div className="tabbar">
        <nav aria-label="메뉴">
          {TABS.map(t => (
            <button type="button" key={t.key} aria-current={page === t.key ? "page" : undefined} onClick={() => { setPage(t.key); window.scrollTo({ top: 0 }); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
