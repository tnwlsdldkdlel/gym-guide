import { describe, expect, it } from "vitest";
import { makeAuthStorage } from "./authStorage";

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("로그인 정보 기억하기", () => {
  it("기본은 기억: 세션을 localStorage에 둔다", () => {
    const local = mem(), session = mem(), s = makeAuthStorage(local, session);
    s.setItem("sb", "token");
    expect(local.getItem("sb")).toBe("token");
    expect(session.getItem("sb")).toBeNull();
  });

  it("끄면 세션은 sessionStorage로, 저장된 이메일은 지운다", () => {
    const local = mem(), session = mem(), s = makeAuthStorage(local, session);
    s.setRemember(true, "a@b.c");
    expect(s.savedEmail()).toBe("a@b.c");
    s.setRemember(false, "a@b.c");
    s.setItem("sb", "token");
    expect(session.getItem("sb")).toBe("token");
    expect(local.getItem("sb")).toBeNull();
    expect(s.savedEmail()).toBe("");
  });

  it("로그아웃은 양쪽에서 모두 지운다", () => {
    const local = mem(), session = mem(), s = makeAuthStorage(local, session);
    local.setItem("sb", "x"); session.setItem("sb", "y");
    s.removeItem("sb");
    expect(local.getItem("sb")).toBeNull();
    expect(session.getItem("sb")).toBeNull();
  });
});
