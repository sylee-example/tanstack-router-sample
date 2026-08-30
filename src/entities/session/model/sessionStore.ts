import { create } from 'zustand';

interface SessionUser {
  id: string;
  name: string;
}

interface SessionState {
  user: SessionUser | null;
  signIn: (name: string) => void;
  signOut: () => void;
}

/**
 * 세션 상태.
 *
 * 라우터 컨텍스트가 아니라 스토어에 두는 이유는, 가드(beforeLoad)가
 * 렌더 밖에서 `getState()` 로 동기적으로 읽어야 하기 때문이다.
 * 샘플이라 토큰 발급 없이 이름만 들고 있는다.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  signIn: (name) => set({ user: { id: `local-${name}`, name } }),
  signOut: () => set({ user: null }),
}));
