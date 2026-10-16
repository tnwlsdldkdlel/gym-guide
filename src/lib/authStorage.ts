type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const REMEMBER = "remember-login";
const EMAIL = "remember-email";

/**
 * "로그인 정보 기억하기"를 끄면 세션을 sessionStorage에 둬서 브라우저를 닫으면 로그아웃된다.
 * 켜면(기본) Supabase 기본값처럼 localStorage에 남는다.
 */
export function makeAuthStorage(local: Store, session: Store) {
  const remembered = () => local.getItem(REMEMBER) !== "0";
  return {
    remembered,
    savedEmail: () => (remembered() ? local.getItem(EMAIL) ?? "" : ""),
    setRemember(on: boolean, email: string) {
      local.setItem(REMEMBER, on ? "1" : "0");
      if (on) local.setItem(EMAIL, email); else local.removeItem(EMAIL);
    },
    // Supabase storage 어댑터
    getItem: (k: string) => (remembered() ? local : session).getItem(k),
    setItem: (k: string, v: string) => (remembered() ? local : session).setItem(k, v),
    removeItem: (k: string) => { local.removeItem(k); session.removeItem(k); },
  };
}
