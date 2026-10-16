import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DEFAULT_ROUTINE } from "./data/defaultRoutines";
import { configured, getActiveRoutine, getProfile, getRoutines, saveProfile, saveRoutine, supabase, type Profile, type RoutineRow } from "./lib/db";
import { hasLegacyKg, mergeShared, type Gender } from "./lib/routine";
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import Today from "./components/Today";
import History from "./components/History";
import RoutinePage from "./components/RoutinePage";
import Skeleton from "./components/Skeleton";

type Page = "today" | "history" | "routine";
const TABS: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: "today", label: "오늘", icon: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /> },
  { key: "history", label: "기록", icon: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M16 3v4M8 3v4M4 11h16" /></> },
  { key: "routine", label: "루틴", icon: <><path d="M9 5h10M9 12h10M9 19h10" /><circle cx="5" cy="5" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="19" r="1" /></> },
];

const pathOf = (p: Page) => (p === "today" ? "/" : `/${p}`);

// 배우자와 연결된 뒤 처음 열면, 각자 쓰던 예전 형식 루틴 둘을 공용 루틴 하나로 합쳐 저장한다(한 번만)
async function toShared(userId: string, gender: Gender, active: RoutineRow): Promise<RoutineRow> {
  if (!hasLegacyKg(active.data)) return active;
  const rows = await getRoutines();
  const mine = rows.find(x => x.user_id === userId), partner = rows.find(x => x.user_id !== userId);
  if (!mine || !partner) return active;
  return saveRoutine(mergeShared(active.data, mine.data, partner.data, gender));
}

export default function App() {
  const [auth, setAuth] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [routine, setRoutine] = useState<RoutineRow | null>(null);
  // 새로고침해도 보던 탭이 유지되게 탭을 경로(/history 등)로 둔다. 탭 3개뿐이라 라우터 라이브러리 없이 History API로 처리
  const [page, setPage] = useState<Page>(() => TABS.find(t => pathOf(t.key) === location.pathname)?.key ?? "today");
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
      .then(async ([p, r]) => { const shared = p && r ? await toShared(userId, p.gender, r) : r; setProfile(p); setRoutine(shared); })
      .catch(e => { console.error(e); setError("정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요."); });
  }, [userId]);

  async function finishOnboarding(p: { gender: "m" | "f"; start_date: string }) {
    await saveProfile(p);
    const r = routine ?? (await saveRoutine(DEFAULT_ROUTINE));
    setRoutine(r);
    setProfile(await getProfile());
  }

  const plain = (children: React.ReactNode) => <div className="screen plain">{children}</div>;
  if (!configured) return plain(<div className="card"><h2 className="title">Supabase 연결이 필요해요</h2><p className="sub">.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 다시 실행해 주세요.</p></div>);
  if (auth === undefined) return plain(<Skeleton />);
  if (!auth) return plain(<Login />);
  if (error) return plain(<p className="err">{error}</p>);
  if (profile === undefined) return plain(<Skeleton />);
  if (!profile || !routine) return plain(<Onboarding onDone={finishOnboarding} />);

  return (
    <>
      {page === "today" && <Today profile={profile} routine={routine} />}
      {page === "history" && <History routine={routine} startDate={profile.start_date} />}
      {page === "routine" && <RoutinePage profile={profile} routine={routine} onSaved={setRoutine} email={auth.user.email ?? ""} />}
      <div className="tabbar">
        <nav aria-label="메뉴">
          {TABS.map(t => (
            <button type="button" key={t.key} aria-current={page === t.key ? "page" : undefined} onClick={() => { setPage(t.key); history.replaceState(null, "", pathOf(t.key)); window.scrollTo({ top: 0 }); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
