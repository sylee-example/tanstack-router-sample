import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useSessionStore } from '@/entities/session';
import { LoginForm } from './ui/LoginForm';

const LoginPage = () => {
  const signIn = useSessionStore((state) => state.signIn);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">TanStack Router × FSD 샘플</h1>
        <LoginForm
          onSubmit={({ username }) => {
            signIn(username);
            void navigate({ to: '/users' });
          }}
        />
      </div>
    </div>
  );
};

// authed 레이아웃 바깥에 두어야 가드에 걸리지 않는다. 여기까지 가드를 걸면 리다이렉트 루프가 된다
export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    // 이미 세션이 있는데 뒤로가기로 들어온 경우 되돌린다
    if (useSessionStore.getState().user) throw redirect({ to: '/users' });
  },
  component: LoginPage,
});
