# TanStack Router × FSD 구조 단순화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TanStack Router의 `routes` 디렉터리를 없애고, 화면 하나가 파일 하나가 되는 FSD 샘플 프로젝트를 만든다. 코드 스플리팅과 lazy loading은 설정으로 자동 동작한다.

**Architecture:** `@tanstack/router-plugin`의 `virtualRouteConfig`로 라우트 트리를 `src/app/routes.ts` 한 파일에 선언하고, 각 라우트가 `src/pages/<slice>/route.tsx`를 직접 가리킨다. `autoCodeSplitting: true`가 각 라우트의 `component`를 별도 청크로 분리하므로 애플리케이션 코드에는 `React.lazy` / `Suspense` 수동 배선이 없다. 인증 가드는 pathless layout 하나에만 존재한다.

**Tech Stack:** React 18.3.1, TypeScript, Vite 7, TanStack Router v1 / Query v5, Zustand 5, antd 5, ag-grid 33, Tailwind CSS 4, React Hook Form + Zod, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-08-30-tanstack-router-fsd-design.md`

## Global Constraints

- 패키지 매니저는 **pnpm**. 모든 명령은 `pnpm`으로 실행한다.
- **`any` 타입 금지.** 타입을 모르겠으면 `unknown` + 좁히기를 쓴다.
- 들여쓰기 스페이스 2칸, 문자열은 **작은따옴표**.
- 주석·문서·커밋 메시지는 **한국어**. 변수명·함수명은 영어(camelCase, 컴포넌트는 PascalCase).
- React 버전은 **18.3.1 고정**(캐럿 없음). `react-dom`도 동일.
- ag-grid는 **33.3.2 고정**(캐럿 없음). `@ag-grid-community/locale`도 동일 버전.
- 경로 별칭은 `@/` → `./src/`. `vite.config.ts`와 `tsconfig.json` 양쪽에 선언한다.
- **`src/routes/` 디렉터리를 만들지 않는다.** 이 계획의 존재 이유다.
- 라우트 파일은 항상 `src/pages/<slice>/route.tsx`이고 항상 `export const Route = createFileRoute('<path>')({ ... })` 한 가지 모양이다.
- 애플리케이션 코드에 `React.lazy` 또는 라우트용 `Suspense` 수동 배선을 넣지 않는다.
- `src/routeTree.gen.ts`는 생성물이다. `.gitignore`에 넣고 커밋하지 않는다.
- **경로 해석 규칙**(스펙 §5에서 소스로 확인함):
  - `virtualRouteConfig` 값 → **프로젝트 루트** 기준
  - `routes.ts` 안의 모든 `file` 문자열 → **`routesDirectory`**(= `./src/app`) 기준
- FSD 의존 방향은 `app` → `pages` → `features` → `entities` → `shared`. 역방향 import 금지.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/app/routes.ts` | 라우트 트리 선언. 전체 URL 구조가 여기 하나에 있다 |
| `src/app/root.tsx` | 루트 라우트. `RouterContext` 타입 정의, 404/에러 컴포넌트 |
| `src/app/router.ts` | `createRouter` + 타입 등록 |
| `src/app/providers.tsx` | QueryClientProvider + antd ConfigProvider |
| `src/app/main.tsx` | 진입점 |
| `src/app/layouts/authed.tsx` | 인증 가드(`beforeLoad`) + antd Layout 껍데기 |
| `src/pages/home-redirect/route.tsx` | `/` → `/users` 리다이렉트 |
| `src/pages/login/route.tsx` | 로그인 라우트 + 화면 |
| `src/pages/login/ui/LoginForm.tsx` | RHF + Zod 폼 |
| `src/pages/users/route.tsx` | 목록 라우트 + loader + 화면 |
| `src/pages/users/ui/UsersGrid.tsx` | ag-grid 목록 |
| `src/pages/user-detail/route.tsx` | 상세 라우트. 동적 param + `validateSearch` |
| `src/features/user-filter/model/filterStore.ts` | 검색어 zustand 스토어 |
| `src/features/user-filter/ui/UserFilter.tsx` | 검색 입력 |
| `src/entities/user/model/types.ts` | `User` 타입 |
| `src/entities/user/api/userQueries.ts` | `queryOptions`. loader와 컴포넌트가 공유한다 |
| `src/entities/session/model/sessionStore.ts` | 세션 zustand 스토어 |
| `src/shared/api/queryClient.ts` | QueryClient 생성 |
| `src/shared/api/mockUserApi.ts` | 목 사용자 API |
| `src/shared/ui/DataGrid.tsx` | ag-grid 모듈 등록·테마·기본 설정 |
| `src/test/setup.ts` | vitest 셋업 |
| `src/test/renderRoute.tsx` | 라우터 테스트 헬퍼 |
| `scripts/verify-chunks.mjs` | 빌드 산출물의 코드 스플리팅 검증 |

---

## Task 1: 프로젝트 스캐폴딩과 가상 라우트 배선

가장 큰 위험(가상 라우트 경로 해석)을 첫 태스크에서 실제 빌드로 확인한다.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.npmrc`
- Create: `src/app/routes.ts`, `src/app/root.tsx`, `src/app/router.ts`, `src/app/providers.tsx`, `src/app/main.tsx`
- Create: `src/pages/home-redirect/route.tsx`
- Create: `src/shared/api/queryClient.ts`, `src/styles.css`
- Create: `src/test/setup.ts`, `src/test/renderRoute.tsx`
- Test: `src/app/router.test.tsx`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `src/shared/api/queryClient.ts` → `createQueryClient(): QueryClient`
  - `src/app/root.tsx` → `interface RouterContext { queryClient: QueryClient }`, `const Route`
  - `src/app/router.ts` → `const router` (전역 라우터), `declare module` 타입 등록
  - `src/app/providers.tsx` → `AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode })`
  - `src/test/renderRoute.tsx` → `renderRoute(initialPath: string)`. Testing Library 의 `RenderResult` 에 `router`(이 호출 전용 인스턴스)와 `queryClient` 를 얹어 반환한다

- [ ] **Step 1: 프로젝트 초기화와 의존성 설치**

```bash
git init
pnpm init
```

`package.json`을 아래 내용으로 덮어쓴다.

```json
{
  "name": "tanstack-router-sample",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "verify:chunks": "node scripts/verify-chunks.mjs"
  }
}
```

의존성을 설치한다.

```bash
pnpm add react@18.3.1 react-dom@18.3.1 \
  @tanstack/react-router @tanstack/react-query \
  zustand antd @ant-design/icons \
  react-hook-form @hookform/resolvers zod \
  ag-grid-community@33.3.2 ag-grid-react@33.3.2 @ag-grid-community/locale@33.3.2

pnpm add -D vite @vitejs/plugin-react-swc typescript \
  @tanstack/router-plugin @tanstack/virtual-file-routes \
  tailwindcss @tailwindcss/vite \
  vitest jsdom @testing-library/react @testing-library/dom \
  @testing-library/jest-dom @testing-library/user-event \
  @types/react@^18.3.11 @types/react-dom@^18.3.1 @types/node
```

- [ ] **Step 2: 설정 파일 작성**

`.npmrc`:

```
auto-install-peers=true
```

`.gitignore`:

```
node_modules
dist
# 생성물 — 커밋하지 않는다
src/routeTree.gen.ts
```

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TanStack Router × FSD 샘플</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/app/main.tsx"></script>
  </body>
</html>
```

`tsconfig.json` — 단일 프로젝트다. `tsc -b`(솔루션 빌드)를 쓰지 않으므로 `references`도 `tsconfig.node.json`도 만들지 않는다.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "types": ["node", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`src/styles.css` — Tailwind v4에서 **preflight를 빼고** 불러온다. preflight의 전역 리셋이 antd 5의 기본 스타일과 충돌하기 때문이다.

```css
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';

/**
 * 벤더 청크 분리.
 * 무거운 라이브러리를 앱 코드와 떼어놓아, 앱 코드만 바뀌었을 때
 * 벤더 청크의 브라우저 캐시가 유지되게 한다.
 */
const manualChunks = (id: string): string | undefined => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('ag-grid')) return 'vendor-ag-grid';
  if (/node_modules[\\/](@ant-design|rc-[^\\/]+)[\\/]/.test(id)) return 'vendor-antd-base';
  if (id.includes('node_modules/@tanstack/')) return 'vendor-tanstack';
  if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
  return undefined;
};

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      // routes.ts 안의 file 경로가 이 디렉터리 기준으로 해석된다.
      // routes.ts 자기 위치 기준이 아니다 — 둘을 같은 디렉터리에 두어 헷갈리지 않게 했다.
      routesDirectory: './src/app',
      // 이 값만 프로젝트 루트 기준이다
      virtualRouteConfig: './src/app/routes.ts',
      generatedRouteTree: './src/routeTree.gen.ts',
      // 각 라우트의 component 를 별도 청크로 분리한다.
      // 이 한 줄이 코드 스플리팅과 lazy loading의 전부다
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // verify:chunks 스크립트가 이 매니페스트를 읽는다
    manifest: true,
    rollupOptions: { output: { manualChunks } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 3: 루트 라우트와 라우팅 지도 작성**

`src/app/root.tsx`:

```tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

/** 모든 라우트의 loader·beforeLoad 가 받는 컨텍스트 */
export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * 라우트 트리의 최상단.
 *
 * 헤더·메뉴 같은 화면 껍데기는 로그인 화면에 있으면 안 되므로 authed 레이아웃으로 내렸다.
 * 루트는 코드 스플리팅 대상이 아니라, 여기 넣은 것은 전 화면이 초기 번들로 받는다.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
});
```

`src/app/routes.ts` — **이 파일이 라우팅 지도의 전부다.**

```ts
import { rootRoute, index } from '@tanstack/virtual-file-routes';

/**
 * 라우트 트리 선언.
 *
 * 여기 있는 파일 경로는 vite.config.ts 의 routesDirectory(= ./src/app) 기준이다.
 * 화면을 추가할 때 손대는 곳은 이 파일과 pages/<slice>/route.tsx 둘뿐이다.
 */
export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
]);
```

`src/pages/home-redirect/route.tsx` — Task 5에서 `/users` 리다이렉트로 바뀐다. 지금은 라우터가 뜨는지 확인할 최소 화면이다.

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <p>홈</p>,
});
```

- [ ] **Step 4: 라우트 트리 생성과 경로 해석 확인**

```bash
pnpm exec vite build
```

기대: `src/routeTree.gen.ts`가 생성된다. 내용을 확인한다.

```bash
grep -n "pages/home-redirect\|app/root" src/routeTree.gen.ts
```

기대: 두 파일을 가리키는 import 문이 보인다.

**여기서 실패하면** 경로 해석이 예상과 다른 것이다. `routesDirectory`가 `./src/app`인지, `routes.ts` 안의 경로가 `../pages/...`(= `src/pages/...`)인지 확인한다. 두 값의 기준이 다르다는 점(스펙 §5 표)이 유일한 함정이다.

- [ ] **Step 5: 나머지 앱 배선 작성**

`src/shared/api/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient 를 만든다.
 *
 * 테스트는 매번 새 인스턴스가 필요해서(캐시가 테스트 간에 새면 안 된다)
 * 싱글턴을 export 하지 않고 팩토리를 export 한다.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // 라우트 loader 가 미리 받아둔 데이터를 컴포넌트가 즉시 재사용하게 한다
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
```

`src/app/router.ts`:

```ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { createQueryClient } from '@/shared/api/queryClient';

export const queryClient = createQueryClient();

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // 링크에 마우스를 올리면 해당 라우트 청크를 미리 받아 스플리팅의 지연을 감춘다
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// 이 선언 덕분에 Link 의 to, useParams, useSearch 가 전부 타입 추론된다
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

`src/app/providers.tsx`:

```tsx
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

export const AppProviders = ({ queryClient, children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider locale={koKR} theme={{ token: { colorPrimary: '#1677ff' } }}>
      {children}
    </ConfigProvider>
  </QueryClientProvider>
);
```

`src/app/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import 'antd/dist/reset.css';
import '@/styles.css';
import { router, queryClient } from '@/app/router';
import { AppProviders } from '@/app/providers';

const container = document.getElementById('root');
if (!container) throw new Error('#root 엘리먼트를 찾을 수 없습니다.');

createRoot(container).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

// ag-grid 와 antd 가 사용하지만 jsdom 에는 없는 API 를 채운다
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

`src/test/renderRoute.tsx` — 라우터 테스트 헬퍼. 테스트마다 새 라우터와 새 QueryClient 를 만들어 상태가 새지 않게 한다.

```tsx
import { render } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { createQueryClient } from '@/shared/api/queryClient';
import { AppProviders } from '@/app/providers';

/**
 * 주어진 경로에서 라우터를 띄운다.
 *
 * 실제 앱의 전역 라우터를 쓰지 않는 이유는 테스트 간 격리다.
 * 전역 라우터는 히스토리와 로더 캐시를 들고 있어 앞 테스트가 뒤 테스트에 샌다.
 */
export const renderRoute = (initialPath: string) => {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  const utils = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { ...utils, router, queryClient };
};
```

- [ ] **Step 6: 실패하는 테스트 작성**

`src/app/router.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/renderRoute';

describe('가상 라우트 배선', () => {
  it('/ 에서 홈 화면이 렌더된다', async () => {
    renderRoute('/');

    expect(await screen.findByText('홈')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 테스트 실행**

```bash
pnpm test
```

기대: PASS. 여기서 실패하면 Step 4의 경로 해석 또는 `renderRoute` 배선 문제다. `src/routeTree.gen.ts`가 존재하는지 먼저 확인한다.

- [ ] **Step 8: 타입 검사와 빌드**

```bash
pnpm typecheck && pnpm build
```

기대: 둘 다 성공.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: virtual file routes 기반 라우터 스캐폴딩

routes 디렉터리 없이 src/app/routes.ts 한 파일로 라우트 트리를 선언한다.
autoCodeSplitting 으로 라우트별 청크 분리를 켰다."
```

---

## Task 2: 사용자 도메인 — 목 API와 queryOptions

**Files:**
- Create: `src/entities/user/model/types.ts`
- Create: `src/entities/user/api/userQueries.ts`
- Create: `src/entities/user/index.ts`
- Create: `src/shared/api/mockUserApi.ts`
- Test: `src/entities/user/api/userQueries.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `src/entities/user/model/types.ts` → `interface User { id: string; name: string; email: string; department: string; active: boolean }`
  - `src/shared/api/mockUserApi.ts` → `fetchUsers(): Promise<User[]>`, `fetchUser(id: string): Promise<User>`
  - `src/entities/user/api/userQueries.ts` → `usersQueryOptions()`, `userQueryOptions(id: string)`
  - `src/entities/user/index.ts` → 위 전부를 재export

- [ ] **Step 1: 실패하는 테스트 작성**

`src/entities/user/api/userQueries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { usersQueryOptions, userQueryOptions } from '@/entities/user';

describe('userQueries', () => {
  it('목록과 상세가 같은 캐시 키 접두사를 쓴다', () => {
    expect(usersQueryOptions().queryKey).toEqual(['users', 'list']);
    expect(userQueryOptions('u-1').queryKey).toEqual(['users', 'detail', 'u-1']);
  });

  it('목록 쿼리가 사용자 배열을 반환한다', async () => {
    const queryClient = new QueryClient();

    const users = await queryClient.fetchQuery(usersQueryOptions());

    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toHaveProperty('email');
  });

  it('없는 사용자를 조회하면 에러를 던진다', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await expect(queryClient.fetchQuery(userQueryOptions('없는-id'))).rejects.toThrow(
      '사용자를 찾을 수 없습니다',
    );
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/entities/user
```

기대: FAIL — `Failed to resolve import "@/entities/user"`

- [ ] **Step 3: 구현 작성**

`src/entities/user/model/types.ts`:

```ts
export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  active: boolean;
}
```

`src/shared/api/mockUserApi.ts`:

```ts
import type { User } from '@/entities/user/model/types';

const USERS: User[] = [
  { id: 'u-1', name: '김서연', email: 'seoyeon@example.com', department: '플랫폼', active: true },
  { id: 'u-2', name: '박도윤', email: 'doyun@example.com', department: '플랫폼', active: true },
  { id: 'u-3', name: '이하준', email: 'hajun@example.com', department: '결제', active: false },
  { id: 'u-4', name: '최지우', email: 'jiwoo@example.com', department: '결제', active: true },
  { id: 'u-5', name: '정민재', email: 'minjae@example.com', department: '데이터', active: true },
  { id: 'u-6', name: '한소율', email: 'soyul@example.com', department: '데이터', active: false },
];

/** 네트워크가 있는 것처럼 보이게 하는 지연. 로더가 실제로 먼저 도는지 눈으로 확인하려는 용도다 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchUsers = async (): Promise<User[]> => {
  await delay(150);
  return USERS;
};

export const fetchUser = async (id: string): Promise<User> => {
  await delay(150);
  const user = USERS.find((candidate) => candidate.id === id);
  if (!user) throw new Error('사용자를 찾을 수 없습니다');
  return user;
};
```

`src/entities/user/api/userQueries.ts`:

```ts
import { queryOptions } from '@tanstack/react-query';
import { fetchUser, fetchUsers } from '@/shared/api/mockUserApi';

/**
 * 라우트 loader 와 컴포넌트가 함께 쓰는 쿼리 정의.
 *
 * 한 곳에만 두는 이유는 쿼리 키가 갈라지는 사고를 없애기 위해서다.
 * 키가 어긋나면 loader 가 받아둔 데이터를 컴포넌트가 못 찾고 다시 요청한다.
 */
export const usersQueryOptions = () =>
  queryOptions({
    queryKey: ['users', 'list'],
    queryFn: fetchUsers,
  });

export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['users', 'detail', id],
    queryFn: () => fetchUser(id),
  });
```

`src/entities/user/index.ts`:

```ts
export type { User } from './model/types';
export { usersQueryOptions, userQueryOptions } from './api/userQueries';
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

```bash
pnpm test src/entities/user
```

기대: 3개 PASS

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 사용자 도메인 목 API 와 queryOptions 추가

loader 와 컴포넌트가 같은 queryOptions 를 공유하도록 entities 에 한 번만 정의한다."
```

---

## Task 3: 세션 스토어와 로그인 화면

**Files:**
- Create: `src/entities/session/model/sessionStore.ts`, `src/entities/session/index.ts`
- Create: `src/pages/login/route.tsx`, `src/pages/login/ui/LoginForm.tsx`
- Modify: `src/app/routes.ts`
- Test: `src/pages/login/login.test.tsx`

**Interfaces:**
- Consumes: `src/test/renderRoute.tsx` → `renderRoute(initialPath)` (Task 1)
- Produces:
  - `src/entities/session/model/sessionStore.ts` → `useSessionStore` (Zustand). 상태: `{ user: { id: string; name: string } | null }`, 액션: `signIn(name: string): void`, `signOut(): void`
  - `src/entities/session/index.ts` → `useSessionStore` 재export

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/login/login.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/renderRoute';
import { useSessionStore } from '@/entities/session';

describe('로그인 화면', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('아이디가 비어 있으면 검증 메시지를 보여준다', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.click(await screen.findByRole('button', { name: '로그인' }));

    expect(await screen.findByText('아이디를 입력하세요')).toBeInTheDocument();
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('아이디를 넣고 제출하면 세션이 생긴다', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.type(await screen.findByLabelText('아이디'), '김서연');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await vi.waitFor(() => {
      expect(useSessionStore.getState().user?.name).toBe('김서연');
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/pages/login
```

기대: FAIL — `Failed to resolve import "@/entities/session"`

- [ ] **Step 3: 세션 스토어 구현**

`src/entities/session/model/sessionStore.ts`:

```ts
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
```

`src/entities/session/index.ts`:

```ts
export { useSessionStore } from './model/sessionStore';
```

- [ ] **Step 4: 로그인 폼 구현**

`src/pages/login/ui/LoginForm.tsx`:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from 'antd';

const schema = z.object({
  username: z.string().min(1, '아이디를 입력하세요'),
});

type LoginValues = z.infer<typeof schema>;

interface LoginFormProps {
  onSubmit: (values: LoginValues) => void;
}

export const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="username" className="text-sm font-medium">
        아이디
      </label>
      <Input id="username" placeholder="이름을 입력하세요" {...register('username')} />
      {errors.username && <span className="text-sm text-red-600">{errors.username.message}</span>}
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        로그인
      </Button>
    </form>
  );
};
```

- [ ] **Step 5: 로그인 라우트 구현과 트리 등록**

`src/pages/login/route.tsx`:

```tsx
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
```

`src/app/routes.ts` — `route` 를 import 에 추가하고 한 줄 넣는다.

```ts
import { rootRoute, index, route } from '@tanstack/virtual-file-routes';

export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
  route('/login', '../pages/login/route.tsx'),
]);
```

`navigate({ to: '/users' })`와 `redirect({ to: '/users' })`는 Task 4에서 `/users` 라우트가 생기기 전까지 타입 에러가 난다. Task 4를 마치기 전에는 `pnpm typecheck`가 이 두 줄에서 실패하는 것이 정상이다. **Task 3의 `pnpm test`는 통과해야 한다** — 런타임에서는 존재하지 않는 경로로의 이동이 예외를 던지지 않는다.

- [ ] **Step 6: 테스트 실행해서 통과 확인**

```bash
pnpm test src/pages/login
```

기대: 2개 PASS

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 세션 스토어와 로그인 화면 추가

라우트 파일 하나에 createFileRoute 와 화면을 함께 둔다.
폼 검증은 React Hook Form + Zod 로 처리한다."
```

---

## Task 4: 인증 레이아웃과 사용자 목록 라우트

가드를 자식마다 붙이지 않고 pathless layout 하나에만 두는 규칙을 세운다.

**Files:**
- Create: `src/app/layouts/authed.tsx`
- Create: `src/pages/users/route.tsx`
- Modify: `src/app/routes.ts`
- Modify: `src/pages/home-redirect/route.tsx`
- Test: `src/app/layouts/authed.test.tsx`

**Interfaces:**
- Consumes:
  - `useSessionStore` (Task 3)
  - `usersQueryOptions()` (Task 2)
  - `RouterContext` — `beforeLoad`/`loader` 의 `context.queryClient` (Task 1)
- Produces:
  - `src/app/layouts/authed.tsx` → `const Route` (pathless layout, id `_authed`)
  - `src/pages/users/route.tsx` → `const Route` (경로 `/_authed/users`, URL 은 `/users`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/layouts/authed.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/renderRoute';
import { useSessionStore } from '@/entities/session';

describe('인증 레이아웃 가드', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('세션이 없으면 /users 진입이 /login 으로 튕긴다', async () => {
    const { router } = renderRoute('/users');

    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });

  it('세션이 있으면 사용자 목록이 렌더된다', async () => {
    useSessionStore.getState().signIn('김서연');

    renderRoute('/users');

    expect(await screen.findByText('seoyeon@example.com')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/app/layouts
```

기대: FAIL — `/users` 라우트가 없어 첫 테스트는 404, 둘째는 텍스트를 찾지 못한다.

- [ ] **Step 3: 인증 레이아웃 구현**

`src/app/layouts/authed.tsx`:

```tsx
import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { Layout, Menu } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useSessionStore } from '@/entities/session';

const menuItems = [
  { key: '/users', icon: <TeamOutlined />, label: <Link to="/users">사용자 관리</Link> },
];

const AuthedLayout = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Layout className="min-h-screen">
      <Layout.Header className="flex items-center gap-6">
        <span className="whitespace-nowrap font-semibold text-white">TanStack Router × FSD</span>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[pathname]}
          items={menuItems}
          className="min-w-0 flex-1"
        />
      </Layout.Header>
      <Layout.Content className="p-4 md:p-6">
        <div className="rounded-lg bg-white p-4">
          <Outlet />
        </div>
      </Layout.Content>
    </Layout>
  );
};

/**
 * 로그인이 필요한 화면들의 공통 부모.
 *
 * 파일명에서 id `_authed` 가 유도되고, `_` 로 시작하므로 URL 에는 나타나지 않는다.
 * 자식은 `/users` 그대로다.
 *
 * 가드를 자식마다 붙이지 않고 여기 한 번만 두는 이유이자,
 * 부모의 beforeLoad 가 자식 컴포넌트 청크보다 먼저 돌아
 * 미인증 사용자는 보호된 화면의 청크를 내려받지도 않는 이유다.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: () => {
    if (!useSessionStore.getState().user) throw redirect({ to: '/login' });
  },
  component: AuthedLayout,
});
```

- [ ] **Step 4: 사용자 목록 라우트 구현**

`src/pages/users/route.tsx` — 그리드는 Task 5에서 붙인다. 지금은 loader → useSuspenseQuery 흐름만 만든다.

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '@/entities/user';

const UsersPage = () => {
  // loader 가 이미 받아둔 데이터라 여기서는 즉시 반환된다
  const { data: users } = useSuspenseQuery(usersQueryOptions());

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.email}</li>
      ))}
    </ul>
  );
};

export const Route = createFileRoute('/_authed/users')({
  // 화면 진입 전에 fetch 를 시작한다. 컴포넌트 청크 다운로드와 병렬로 돈다
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQueryOptions()),
  component: UsersPage,
});
```

- [ ] **Step 5: 라우팅 지도에 등록하고 인덱스를 리다이렉트로 바꾸기**

`src/app/routes.ts`:

```ts
import { rootRoute, index, route, layout } from '@tanstack/virtual-file-routes';

export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
  route('/login', '../pages/login/route.tsx'),
  layout('layouts/authed.tsx', [
    route('/users', '../pages/users/route.tsx'),
  ]),
]);
```

`src/pages/home-redirect/route.tsx` — Task 1의 임시 화면을 리다이렉트로 교체한다.

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/users' });
  },
});
```

Task 1의 `src/app/router.test.tsx`가 '홈' 텍스트를 찾으므로 함께 고친다.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderRoute } from '@/test/renderRoute';

describe('가상 라우트 배선', () => {
  it('/ 는 /users 로 리다이렉트한다', async () => {
    const { router } = renderRoute('/');

    await vi.waitFor(() => {
      expect(router.state.location.pathname).not.toBe('/');
    });
  });
});
```

- [ ] **Step 6: 테스트 실행해서 통과 확인**

```bash
pnpm test
```

기대: 전부 PASS

- [ ] **Step 7: 타입 검사**

```bash
pnpm typecheck
```

기대: 성공. Task 3에서 남겨둔 `/users` 관련 타입 에러가 여기서 해소된다. 실패하면 `src/routeTree.gen.ts`가 최신인지 확인한다 (`pnpm exec vite build`로 재생성).

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: 인증 레이아웃 가드와 사용자 목록 라우트 추가

가드는 pathless layout 한 곳에만 둔다.
목록 데이터는 loader 에서 ensureQueryData 로 미리 받고 컴포넌트는 useSuspenseQuery 로 읽는다."
```

---

## Task 5: ag-grid 목록과 검색 필터

**Files:**
- Create: `src/shared/ui/DataGrid.tsx`
- Create: `src/features/user-filter/model/filterStore.ts`, `src/features/user-filter/ui/UserFilter.tsx`, `src/features/user-filter/index.ts`
- Create: `src/pages/users/ui/UsersGrid.tsx`
- Modify: `src/pages/users/route.tsx`
- Test: `src/features/user-filter/filterStore.test.ts`

**Interfaces:**
- Consumes: `User` 타입, `usersQueryOptions()` (Task 2)
- Produces:
  - `src/shared/ui/DataGrid.tsx` → `DataGrid<TData>(props: AgGridReactProps<TData> & { height?: number | string })`
  - `src/features/user-filter/model/filterStore.ts` → `useUserFilterStore` (Zustand). 상태: `{ keyword: string }`, 액션: `setKeyword(value: string): void`
  - `src/features/user-filter/index.ts` → `useUserFilterStore`, `UserFilter`
  - `src/pages/users/ui/UsersGrid.tsx` → `UsersGrid({ users }: { users: User[] })`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/user-filter/filterStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUserFilterStore, filterUsers } from '@/features/user-filter';
import type { User } from '@/entities/user';

const USERS: User[] = [
  { id: 'u-1', name: '김서연', email: 'seoyeon@example.com', department: '플랫폼', active: true },
  { id: 'u-2', name: '이하준', email: 'hajun@example.com', department: '결제', active: false },
];

describe('사용자 필터', () => {
  beforeEach(() => {
    useUserFilterStore.getState().setKeyword('');
  });

  it('키워드를 저장한다', () => {
    useUserFilterStore.getState().setKeyword('결제');

    expect(useUserFilterStore.getState().keyword).toBe('결제');
  });

  it('이름·이메일·부서 어디든 걸리면 남긴다', () => {
    expect(filterUsers(USERS, '결제')).toHaveLength(1);
    expect(filterUsers(USERS, 'seoyeon')).toHaveLength(1);
    expect(filterUsers(USERS, '김서연')).toHaveLength(1);
  });

  it('대소문자를 무시하고, 빈 키워드는 전부 통과시킨다', () => {
    expect(filterUsers(USERS, 'SEOYEON')).toHaveLength(1);
    expect(filterUsers(USERS, '   ')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/features/user-filter
```

기대: FAIL — `Failed to resolve import "@/features/user-filter"`

- [ ] **Step 3: 필터 구현**

`src/features/user-filter/model/filterStore.ts`:

```ts
import { create } from 'zustand';
import type { User } from '@/entities/user';

interface UserFilterState {
  keyword: string;
  setKeyword: (value: string) => void;
}

export const useUserFilterStore = create<UserFilterState>((set) => ({
  keyword: '',
  setKeyword: (value) => set({ keyword: value }),
}));

/**
 * 키워드로 사용자를 거른다.
 *
 * 스토어 밖의 순수 함수로 둔 이유는 테스트와 재사용 때문이다.
 * 서버 검색으로 바뀌면 이 함수만 쿼리 파라미터로 교체된다.
 */
export const filterUsers = (users: User[], keyword: string): User[] => {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return users;

  return users.filter((user) =>
    [user.name, user.email, user.department].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
};
```

`src/features/user-filter/ui/UserFilter.tsx`:

```tsx
import { Input } from 'antd';
import { useUserFilterStore } from '../model/filterStore';

export const UserFilter = () => {
  const keyword = useUserFilterStore((state) => state.keyword);
  const setKeyword = useUserFilterStore((state) => state.setKeyword);

  return (
    <Input.Search
      aria-label="사용자 검색"
      placeholder="이름 · 이메일 · 부서로 검색"
      value={keyword}
      onChange={(event) => setKeyword(event.target.value)}
      allowClear
      className="max-w-xs"
    />
  );
};
```

`src/features/user-filter/index.ts`:

```ts
export { useUserFilterStore, filterUsers } from './model/filterStore';
export { UserFilter } from './ui/UserFilter';
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

```bash
pnpm test src/features/user-filter
```

기대: 3개 PASS

- [ ] **Step 5: 공통 그리드 구현**

`src/shared/ui/DataGrid.tsx` — ag-grid v33은 모듈을 명시적으로 등록해야 한다. 등록하지 않은 기능을 쓰면 런타임 에러가 난다.

```tsx
import { useMemo } from 'react';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  PaginationModule,
  TextFilterModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  LocaleModule,
  ValidationModule,
  themeQuartz,
  type ColDef,
  type Module,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_KR } from '@ag-grid-community/locale';

/**
 * ag-grid v33 모듈 선택 등록.
 *
 * AllCommunityModule 을 쓰면 편하지만 커뮤니티 기능 전체가 번들에 들어간다.
 * 실제로 쓰는 모듈만 등록해 트리셰이킹이 나머지를 걷어내게 한다.
 * 새 기능(행 선택, 인라인 편집 등)을 켤 때는 여기에 모듈을 추가해야 한다.
 */
const modules: Module[] = [
  ClientSideRowModelModule,
  PaginationModule,
  TextFilterModule,
  ColumnAutoSizeModule,
  CellStyleModule,
  LocaleModule,
];

// 설정 실수를 콘솔에 알려주는 개발용 모듈이라 프로덕션에서는 뺀다
if (import.meta.env.DEV) modules.push(ValidationModule);

ModuleRegistry.registerModules(modules);

/** v33 Theming API. CSS 파일을 import 하지 않으므로 스타일시트가 통째로 실리지 않는다 */
const gridTheme = themeQuartz.withParams({
  accentColor: '#1677ff',
  borderRadius: 6,
  headerBackgroundColor: '#fafafa',
  headerFontWeight: 600,
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 44,
  headerHeight: 44,
});

const defaultColDefBase: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 100,
  flex: 1,
};

interface DataGridProps<TData> extends AgGridReactProps<TData> {
  /** 컨테이너 높이. ag-grid 는 부모 높이가 없으면 렌더링되지 않는다 */
  height?: number | string;
}

export const DataGrid = <TData,>({
  height = 480,
  defaultColDef,
  ...props
}: DataGridProps<TData>) => {
  const mergedDefaultColDef = useMemo<ColDef>(
    () => ({ ...defaultColDefBase, ...defaultColDef }),
    [defaultColDef],
  );

  return (
    <div className="w-full" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <AgGridReact<TData>
        theme={gridTheme}
        localeText={AG_GRID_LOCALE_KR}
        defaultColDef={mergedDefaultColDef}
        rowModelType="clientSide"
        animateRows
        {...props}
      />
    </div>
  );
};
```

- [ ] **Step 6: 목록 화면에 그리드와 필터 연결**

`src/pages/users/ui/UsersGrid.tsx`:

```tsx
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Tag } from 'antd';
import type { ColDef } from 'ag-grid-community';
import { DataGrid } from '@/shared/ui/DataGrid';
import type { User } from '@/entities/user';

interface UsersGridProps {
  users: User[];
}

export const UsersGrid = ({ users }: UsersGridProps) => {
  const columnDefs = useMemo<ColDef<User>[]>(
    () => [
      {
        headerName: '이름',
        field: 'name',
        cellRenderer: ({ data }: { data?: User }) =>
          data ? (
            <Link to="/users/$userId" params={{ userId: data.id }} search={{ tab: 'profile' }}>
              {data.name}
            </Link>
          ) : null,
      },
      { headerName: '이메일', field: 'email', flex: 2 },
      { headerName: '부서', field: 'department' },
      {
        headerName: '상태',
        field: 'active',
        cellRenderer: ({ value }: { value?: boolean }) => (
          <Tag color={value ? 'green' : 'default'}>{value ? '활성' : '비활성'}</Tag>
        ),
      },
    ],
    [],
  );

  return <DataGrid<User> rowData={users} columnDefs={columnDefs} pagination paginationPageSize={20} />;
};
```

`src/pages/users/route.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '@/entities/user';
import { UserFilter, useUserFilterStore, filterUsers } from '@/features/user-filter';
import { UsersGrid } from './ui/UsersGrid';

const UsersPage = () => {
  // loader 가 이미 받아둔 데이터라 여기서는 즉시 반환된다
  const { data: users } = useSuspenseQuery(usersQueryOptions());
  const keyword = useUserFilterStore((state) => state.keyword);

  const visibleUsers = filterUsers(users, keyword);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">사용자 관리</h2>
        <UserFilter />
      </div>
      <UsersGrid users={visibleUsers} />
      <p className="text-sm text-slate-500">{visibleUsers.length}명</p>
    </div>
  );
};

export const Route = createFileRoute('/_authed/users')({
  // 화면 진입 전에 fetch 를 시작한다. 컴포넌트 청크 다운로드와 병렬로 돈다
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQueryOptions()),
  component: UsersPage,
});
```

`Link`의 `to="/users/$userId"`는 Task 6에서 해당 라우트가 생기기 전까지 타입 에러가 난다. Task 6을 마치기 전에는 `pnpm typecheck` 실패가 정상이다.

- [ ] **Step 7: 기존 레이아웃 테스트 갱신**

`src/app/layouts/authed.test.tsx`의 두 번째 테스트가 `<li>` 텍스트를 찾고 있었다. 그리드로 바뀌었으므로 헤더를 확인하도록 바꾼다.

```tsx
  it('세션이 있으면 사용자 목록이 렌더된다', async () => {
    useSessionStore.getState().signIn('김서연');

    renderRoute('/users');

    expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument();
    expect(await screen.findByText('6명')).toBeInTheDocument();
  });
```

ag-grid 셀은 jsdom 에서 가상 스크롤 때문에 안정적으로 잡히지 않는다. 그래서 셀 내용 대신 로더가 받아온 행 수(`6명`)를 검증한다.

- [ ] **Step 8: 테스트 실행해서 통과 확인**

```bash
pnpm test
```

기대: 전부 PASS

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: 사용자 목록에 ag-grid 와 검색 필터 연결

ag-grid v33 모듈 등록과 테마를 shared/ui/DataGrid 한 곳에 모은다.
필터 상태는 zustand, 거르는 로직은 순수 함수로 분리했다."
```

---

## Task 6: 사용자 상세 — 동적 param 과 search param 검증

**Files:**
- Create: `src/pages/user-detail/route.tsx`
- Modify: `src/app/routes.ts`
- Test: `src/pages/user-detail/userDetail.test.tsx`

**Interfaces:**
- Consumes: `userQueryOptions(id)` (Task 2), `useSessionStore` (Task 3), authed 레이아웃 (Task 4)
- Produces: `src/pages/user-detail/route.tsx` → `const Route` (경로 `/_authed/users/$userId`, URL 은 `/users/:userId`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/user-detail/userDetail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/renderRoute';
import { useSessionStore } from '@/entities/session';

describe('사용자 상세', () => {
  beforeEach(() => {
    useSessionStore.getState().signIn('김서연');
  });

  it('경로 파라미터로 사용자를 불러온다', async () => {
    renderRoute('/users/u-1?tab=profile');

    expect(await screen.findByText('seoyeon@example.com')).toBeInTheDocument();
  });

  it('잘못된 tab 값은 profile 로 보정된다', async () => {
    const { router } = renderRoute('/users/u-1?tab=없는탭');

    await vi.waitFor(() => {
      expect(router.state.location.search).toEqual({ tab: 'profile' });
    });
  });

  it('tab 을 빼면 기본값이 들어간다', async () => {
    const { router } = renderRoute('/users/u-1');

    await vi.waitFor(() => {
      expect(router.state.location.search).toEqual({ tab: 'profile' });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/pages/user-detail
```

기대: FAIL — 라우트가 없어 404가 뜬다.

- [ ] **Step 3: 상세 라우트 구현**

`src/pages/user-detail/route.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Descriptions, Tabs, Tag } from 'antd';
import { z } from 'zod';
import { userQueryOptions } from '@/entities/user';

/**
 * URL 쿼리스트링 스키마.
 *
 * catch 를 붙여 잘못된 값이 와도 화면이 깨지지 않고 기본값으로 보정되게 한다.
 * 사용자가 URL 을 직접 고치거나 오래된 링크를 여는 경우가 실제로 생긴다.
 */
const searchSchema = z.object({
  tab: z.enum(['profile', 'activity']).catch('profile'),
});

const UserDetailPage = () => {
  const { userId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: user } = useSuspenseQuery(userQueryOptions(userId));

  return (
    <div className="flex flex-col gap-4">
      <Link to="/users" className="text-sm">
        ← 목록으로
      </Link>
      <h2 className="text-lg font-semibold">{user.name}</h2>
      <Tabs
        activeKey={tab}
        onChange={(key) => void navigate({ search: { tab: key as 'profile' | 'activity' } })}
        items={[
          {
            key: 'profile',
            label: '프로필',
            children: (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="이메일">{user.email}</Descriptions.Item>
                <Descriptions.Item label="부서">{user.department}</Descriptions.Item>
                <Descriptions.Item label="상태">
                  <Tag color={user.active ? 'green' : 'default'}>
                    {user.active ? '활성' : '비활성'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          { key: 'activity', label: '활동', children: <p>활동 내역이 없습니다.</p> },
        ]}
      />
    </div>
  );
};

export const Route = createFileRoute('/_authed/users/$userId')({
  validateSearch: searchSchema,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(userQueryOptions(params.userId)),
  component: UserDetailPage,
});
```

- [ ] **Step 4: 라우팅 지도에 등록**

`src/app/routes.ts`:

```ts
import { rootRoute, index, route, layout } from '@tanstack/virtual-file-routes';

export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
  route('/login', '../pages/login/route.tsx'),
  layout('layouts/authed.tsx', [
    route('/users', '../pages/users/route.tsx'),
    route('/users/$userId', '../pages/user-detail/route.tsx'),
  ]),
]);
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

```bash
pnpm test
```

기대: 전부 PASS

- [ ] **Step 6: 타입 검사**

```bash
pnpm typecheck
```

기대: 성공. Task 5에서 남겨둔 `Link to="/users/$userId"` 타입 에러가 해소된다.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 사용자 상세 라우트 추가

동적 파라미터와 Zod 기반 search param 검증을 한 파일에서 보여준다.
잘못된 tab 값은 catch 로 기본값 보정한다."
```

---

## Task 7: 404·에러 처리, 코드 스플리팅 검증, README

**Files:**
- Modify: `src/app/root.tsx`
- Create: `scripts/verify-chunks.mjs`
- Create: `README.md`
- Test: `src/app/notFound.test.tsx`

**Interfaces:**
- Consumes: 앞선 모든 라우트
- Produces: `pnpm verify:chunks` — 빌드 산출물이 라우트별로 분리되었는지 검사하고, 아니면 종료 코드 1

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/notFound.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/renderRoute';

describe('404', () => {
  it('없는 경로는 안내 화면을 보여준다', async () => {
    renderRoute('/이런-경로는-없다');

    expect(await screen.findByText('페이지를 찾을 수 없습니다')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test src/app/notFound
```

기대: FAIL — 기본 404 화면에는 해당 문구가 없다.

- [ ] **Step 3: 루트에 404·에러 컴포넌트 추가**

`src/app/root.tsx`:

```tsx
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Button, Result } from 'antd';

/** 모든 라우트의 loader·beforeLoad 가 받는 컨텍스트 */
export interface RouterContext {
  queryClient: QueryClient;
}

const NotFound = () => (
  <Result
    status="404"
    title="페이지를 찾을 수 없습니다"
    extra={
      <Link to="/users">
        <Button type="primary">사용자 목록으로</Button>
      </Link>
    }
  />
);

/**
 * 라우트 로드 실패 화면.
 *
 * 코드 스플리팅을 켜면 청크 다운로드 실패가 실제로 일어난다
 * (배포 직후 오래된 탭에서 사라진 청크를 요청하는 경우).
 * 그래서 새로고침을 권하는 안내를 둔다.
 */
const RouteError = ({ error }: { error: Error }) => (
  <Result
    status="error"
    title="화면을 불러오지 못했습니다"
    subTitle={error.message}
    extra={
      <Button type="primary" onClick={() => window.location.reload()}>
        새로고침
      </Button>
    }
  />
);

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

```bash
pnpm test
```

기대: 전부 PASS

- [ ] **Step 5: 코드 스플리팅 검증 스크립트 작성**

`scripts/verify-chunks.mjs`:

```js
import { readFileSync } from 'node:fs';

/**
 * 라우트 컴포넌트가 초기 번들에서 빠져 있는지 검사한다.
 *
 * autoCodeSplitting 은 라우트 파일을 둘로 쪼갠다.
 * 라우트 정의(경로·loader)는 초기 번들에 남고, component 만 별도 청크로 나간다.
 * 그래서 "route.tsx 가 초기 번들에 있는가"가 아니라
 * "분리된 component 청크가 초기 번들에 섞였는가"를 봐야 한다.
 */
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) {
  console.error('엔트리 청크를 찾을 수 없다. pnpm build 를 먼저 실행해라.');
  process.exit(1);
}

// 엔트리에서 정적 import 로만 도달하는 청크 집합.
// dynamicImports 는 따라가지 않는다 — 그게 lazy 경계다
const eager = new Set();
const walk = (key) => {
  if (eager.has(key)) return;
  eager.add(key);
  for (const next of manifest[key]?.imports ?? []) walk(next);
};
walk(entryKey);

const splitChunks = Object.keys(manifest).filter((key) => key.includes('tsr-split'));

if (splitChunks.length === 0) {
  console.error('코드 스플리팅된 라우트 청크가 없다. vite.config.ts 의 autoCodeSplitting 을 확인해라.');
  console.error('매니페스트 키 목록:');
  for (const key of Object.keys(manifest)) console.error(`  ${key}`);
  process.exit(1);
}

const leaked = splitChunks.filter((key) => eager.has(key));

if (leaked.length > 0) {
  console.error('초기 번들에 라우트 컴포넌트가 섞였다:');
  for (const key of leaked) console.error(`  ${key}`);
  process.exit(1);
}

console.log(`OK — 라우트 컴포넌트 청크 ${splitChunks.length}개가 모두 초기 번들 밖에 있다.`);
for (const key of splitChunks) console.log(`  ${key}`);
```

- [ ] **Step 6: 스크립트 실행해서 확인**

```bash
pnpm build && pnpm verify:chunks
```

기대: `OK — 라우트 컴포넌트 청크 4개가 모두 초기 번들 밖에 있다.`

**`코드 스플리팅된 라우트 청크가 없다`로 실패하면** 스크립트가 출력한 매니페스트 키 목록을 본다. 분리된 청크의 키가 `tsr-split`이 아닌 다른 표식(예: `?tsr-serialized`)을 쓰고 있을 수 있다. 목록에서 라우트 컴포넌트에 해당하는 키의 공통 패턴을 찾아 스크립트의 `includes('tsr-split')`를 그 패턴으로 바꾼다. 검사 논리(초기 번들 도달 여부)는 그대로 둔다.

- [ ] **Step 7: README 작성**

`README.md`:

````markdown
# TanStack Router × FSD 샘플

`routes` 디렉터리 없이 TanStack Router 를 쓰는 구조. 화면 하나가 파일 하나다.

## 규칙 4개

라우터를 쓰기 위해 알아야 할 전부다.

### 1. 라우트 추가 = 두 곳

`src/app/routes.ts` 에 한 줄, `src/pages/<slice>/route.tsx` 에 한 파일.

```ts
// src/app/routes.ts
layout('layouts/authed.tsx', [
  route('/users', '../pages/users/route.tsx'),
  route('/orders', '../pages/orders/route.tsx'),  // ← 추가
]);
```

경로는 `vite.config.ts` 의 `routesDirectory`(= `src/app`) 기준이다.

### 2. route.tsx 는 항상 같은 모양

```tsx
export const Route = createFileRoute('<path>')({ loader?, component });
```

`<path>` 는 라우트 트리에서의 경로다. `layout()` 안에 있으면 앞에 레이아웃 id 가 붙는다
(`/users` → `/_authed/users`). URL 에는 `_authed` 가 나타나지 않는다.

### 3. 가드는 레이아웃에만

`src/app/layouts/authed.tsx` 의 `beforeLoad` 한 곳에만 인증 검사가 있다.
페이지마다 붙이지 않는다. 부모의 `beforeLoad` 가 자식 컴포넌트 청크보다 먼저 돌아,
미인증 사용자는 보호된 화면의 청크를 내려받지도 않는다.

### 4. 데이터는 loader 에서 시작

```tsx
loader: ({ context }) => context.queryClient.ensureQueryData(usersQueryOptions()),
```

컴포넌트는 같은 `queryOptions` 를 `useSuspenseQuery` 로 읽기만 한다.
`queryOptions` 는 `entities/<domain>/api` 에 한 번만 정의한다 — 쿼리 키가 갈라지지 않게.

## 코드 스플리팅

`vite.config.ts` 의 `autoCodeSplitting: true` 한 줄이 전부다.
각 라우트의 `component` 가 별도 청크로 나가고, `defaultPreload: 'intent'` 가
링크 hover 시점에 미리 받아 지연을 감춘다.

애플리케이션 코드에 `React.lazy` 나 라우트용 `Suspense` 배선은 없다.

검증:

```bash
pnpm build && pnpm verify:chunks
```

## 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 타입 검사 + 프로덕션 빌드 |
| `pnpm test` | 테스트 |
| `pnpm typecheck` | 타입 검사만 |
| `pnpm verify:chunks` | 빌드 산출물의 코드 스플리팅 검증 |

## 디렉터리

```
src/
  app/         routes.ts(라우팅 지도), root.tsx, router.ts, providers.tsx, layouts/
  pages/       <slice>/route.tsx + ui/
  features/    <slice>/model/ + ui/
  entities/    <domain>/api/ + model/
  shared/      api/ ui/ lib/
```

의존 방향은 `app` → `pages` → `features` → `entities` → `shared`. 역방향 import 는 하지 않는다.

`src/routeTree.gen.ts` 는 생성물이라 커밋하지 않는다. `pnpm dev` 또는 `pnpm build` 가 만든다.
````

- [ ] **Step 8: 전체 검증**

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm verify:chunks
```

기대: 전부 성공.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: 404·에러 화면, 코드 스플리팅 검증 스크립트, README 추가

verify:chunks 는 분리된 라우트 컴포넌트 청크가 초기 번들에 섞이면 실패한다."
```

---

## 완료 기준

스펙 §13에 대응한다.

- [ ] `src/routes/` 디렉터리가 없다
- [ ] 화면 하나가 `pages/<slice>/route.tsx` 파일 하나다
- [ ] 새 화면 추가가 `app/routes.ts` 한 줄 + `route.tsx` 한 파일로 끝난다
- [ ] `pnpm verify:chunks` 가 통과한다
- [ ] 애플리케이션 코드에 `React.lazy` / 라우트용 `Suspense` 수동 배선이 없다
- [ ] `pnpm typecheck && pnpm test && pnpm build` 가 전부 통과한다
