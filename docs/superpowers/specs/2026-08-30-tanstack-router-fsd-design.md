# TanStack Router × FSD 구조 단순화 설계

- 작성일: 2026-08-30
- 대상 저장소: `tanstack-router-sample` (신규 샘플)
- 참조 저장소: `../vertx-front-template` (동일 스택의 기존 구현)

## 1. 배경

기존 템플릿(`vertx-front-template`)은 이미 다음을 갖추고 있다.

- 파일 기반 라우팅 (`src/routes/`)
- 라우트 단위 자동 코드 스플리팅 (`autoCodeSplitting: true`)
- hover 프리페치 (`defaultPreload: 'intent'`)

즉 **코드 스플리팅과 lazy loading은 이미 동작한다.** 실제 불편은 다른 곳에 있다.

`src/routes/` 아래 7개 파일 중 4개가 `src/pages/`의 컴포넌트를 그대로 감싸는 3줄짜리 어댑터다.

```tsx
// src/routes/_authed/users.tsx — 파일 전체
import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/pages/users';

export const Route = createFileRoute('/_authed/users')({
  component: UsersPage,
});
```

FSD의 `pages` 레이어와 라우터의 `routes` 디렉터리가 **같은 개념을 두 번 표현**한다. 화면 하나를 추가하려면 두 곳을 건드려야 하고, 라우트 파일의 경로 문자열(`'/_authed/users'`)은 디렉터리 위치와 반드시 일치해야 한다. 이 이중 구조가 "TanStack Router는 어렵다"는 체감의 실체다.

## 2. 목표

1. 화면 하나 = 파일 하나. `routes` 디렉터리 제거.
2. 라우터를 쓰기 위해 외울 규칙을 **4개**로 고정.
3. 코드 스플리팅 / lazy loading은 설정으로 자동 유지 — 애플리케이션 코드에 `React.lazy`, `Suspense` 수동 배선 없음.
4. FSD 레이어 경계(`app` → `pages` → `features` → `entities` → `shared`)는 유지.

### 목표가 아닌 것

- 기존 `vertx-front-template` 리팩터 (별도 작업으로 분리)
- 실시간 소켓, 포털 세션 연동, MSW 이중 진입점 — 샘플 목적에 불필요
- SSR / TanStack Start

## 3. 접근 방식: Virtual File Routes

`@tanstack/router-plugin`의 `virtualRouteConfig` 옵션을 사용한다. 라우트 트리를 **코드 한 파일**로 선언하고, 각 라우트가 가리킬 컴포넌트 파일 경로를 직접 지정한다. 디렉터리 구조가 URL을 결정하지 않으므로 라우트 파일을 FSD의 `pages` 슬라이스 안에 그대로 둘 수 있다.

설치된 플러그인 버전에서 지원을 확인했다 (`@tanstack/router-plugin@1.168.29`, `dist/esm/vite.d.ts:55`).

### 검토했으나 채택하지 않은 대안

| 대안 | 기각 사유 |
|---|---|
| 현재 파일 기반 유지 + 규칙 문서화 | 이중 구조가 그대로 남는다. 문서로 가릴 뿐 파일 수는 줄지 않는다. |
| 코드 기반 라우트 (`createRoute` 수동 조립) | 생성 파일은 사라지지만 라우트마다 `.lazy()`를 손으로 붙여야 한다. 목표 3에 정면으로 어긋난다. |

## 4. 디렉터리 구조

```
src/
  app/
    routes.ts            # 라우팅 지도 — 전체 URL 구조가 이 파일 하나에 있다
    root.tsx             # __root: RouterContext 정의 + <Outlet/>
    layouts/
      authed.tsx         # 인증 가드(beforeLoad) + antd Layout 껍데기
    router.ts            # createRouter + declare module 타입 등록
    providers.tsx        # QueryClientProvider + antd ConfigProvider
    main.tsx             # 진입점
  pages/
    home-redirect/
      route.tsx          # index 라우트 — /users 로 리다이렉트만 한다
    login/
      route.tsx          # createFileRoute + 화면
      ui/LoginForm.tsx
    users/
      route.tsx          # createFileRoute + loader + 화면
      ui/UsersGrid.tsx   # ag-grid
    user-detail/
      route.tsx
  features/
    user-filter/         # zustand 필터 상태 + 필터 UI
  entities/
    user/
      api/               # queryOptions (loader와 컴포넌트가 공유)
      model/             # 타입
  shared/
    api/                 # queryClient, http 클라이언트
    config/              # env
    lib/
    ui/
  routeTree.gen.ts       # 생성물 — gitignore 대상
```

`src/routes/`는 존재하지 않는다.

## 5. 라우팅 지도

```ts
// src/app/routes.ts
import { rootRoute, layout, route, index } from '@tanstack/virtual-file-routes';

export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
  route('/login', '../pages/login/route.tsx'),
  layout('layouts/authed.tsx', [
    route('/users', '../pages/users/route.tsx'),
    route('/users/$userId', '../pages/user-detail/route.tsx'),
  ]),
]);
```

`layout()`은 URL에 나타나지 않는 부모다. 인증 가드를 자식마다 붙이지 않고 한 곳에 두기 위한 장치이며, 부모의 `beforeLoad`가 자식 컴포넌트 청크보다 먼저 실행되므로 미인증 사용자는 보호된 화면의 청크를 내려받지도 않는다.

### 경로 해석 규칙 (소스로 확인함)

`@tanstack/router-generator@1.167.27` 소스에서 확인한 결과는 다음과 같다.

| 대상 | 기준 | 근거 |
|---|---|---|
| `virtualRouteConfig` 값 | 프로젝트 루트 | `filesystem/virtual/getRouteNodes.js:55` — `join(root, virtualRouteConfig)` |
| `routes.ts` 안의 모든 `file` 문자열 | `routesDirectory` | `filesystem/virtual/getRouteNodes.js:96` — `join(fullDir, filePath)`, `fullDir = resolve(routesDirectory)` |

`file` 경로는 `routes.ts` 자신의 위치가 아니라 `routesDirectory` 기준이다. 따라서 `routesDirectory`를 `./src/app`으로 두면 `routes.ts`가 같은 디렉터리에 있어 두 기준이 일치한다.

`routesDirectory`를 `./src`로 넓히지 않는 이유는 재생성 트리거다. `generator.js:754`가 `filePath.startsWith(routesDirectoryPath)`인 파일을 전부 "라우트 트리 재생성 대상"으로 판정하므로, `./src`로 두면 소스 파일을 저장할 때마다 재생성 검사가 돈다. `./src/app` 밖의 `pages/*/route.tsx`는 최초 생성 후 `routeNodeCache`에 등록되어(`generator.js:756`) 계속 추적된다.

가상 설정만 쓰고 `physical()` 노드를 두지 않으므로 제너레이터는 디렉터리를 스캔하지 않는다 (`getRouteNodes.js:68`). `routesDirectory`에 `__root.tsx`가 없어도 오류가 아니다 — 루트 파일은 `rootRoute()`의 인자로 지정된다 (`generator.js:165`).

파일명 `routes.ts`는 안전하다. 제너레이터가 특별 취급하는 이름은 `__virtual.[mc]?[jt]s` 뿐이다 (`filesystem/physical/getRouteNodes.js:10`).

## 6. 빌드 설정

```ts
// vite.config.ts (라우터 관련 부분)
tanstackRouter({
  target: 'react',
  // routes.ts 안의 file 경로가 이 디렉터리 기준으로 해석된다
  routesDirectory: './src/app',
  // 이 값만 프로젝트 루트 기준이다
  virtualRouteConfig: './src/app/routes.ts',
  generatedRouteTree: './src/routeTree.gen.ts',
  autoCodeSplitting: true,
})
```

`autoCodeSplitting`이 각 `route.tsx`의 `component`를 별도 청크로 분리한다. 애플리케이션 코드에는 `React.lazy`도 `Suspense` 배선도 없다.

`createRouter`에는 `defaultPreload: 'intent'`를 준다. 링크에 마우스를 올리는 순간 해당 라우트 청크를 미리 받아 스플리팅의 지연을 감춘다.

벤더 청크는 `manualChunks`로 분리한다. ag-grid와 antd 저수준 의존성(`rc-*`, `@ant-design/*`)이 앱 코드 변경 때마다 캐시 무효화되지 않도록 한다.

## 7. 규칙 4개

이 프로젝트에서 라우터를 쓰기 위해 알아야 할 전부다.

1. **라우트 추가** = `app/routes.ts`에 한 줄 + `pages/<name>/route.tsx` 한 파일.
2. **`route.tsx`는 항상 같은 모양**이다.
   ```tsx
   export const Route = createFileRoute('<path>')({ loader?, component });
   ```
3. **가드는 레이아웃에만 둔다.** 페이지마다 붙이지 않는다. 인증 검사는 `layouts/authed.tsx`의 `beforeLoad` 한 곳에만 존재한다.
4. **데이터는 loader에서 시작한다.** `queryClient.ensureQueryData(entities의 queryOptions)`로 화면 진입 전에 fetch를 걸고, 컴포넌트는 같은 `queryOptions`를 `useSuspenseQuery`로 받기만 한다.

## 8. 데이터 흐름

```
app/routes.ts (트리 선언)
      ↓ 코드 생성
routeTree.gen.ts
      ↓
app/router.ts  ── context: { queryClient } ──┐
      ↓                                       │
pages/users/route.tsx                         │
  loader: ({ context }) =>                    │
    context.queryClient.ensureQueryData(  ←───┘
      entities/user/api → usersQueryOptions()
    )
  component:
    useSuspenseQuery(usersQueryOptions())  ← 같은 키, 캐시 적중
    features/user-filter (zustand)
    pages/users/ui/UsersGrid.tsx (ag-grid)
```

`queryOptions`를 `entities/user/api`에 한 번만 정의하고 loader와 컴포넌트가 공유한다. 쿼리 키가 갈라질 여지가 없다.

라우터 컨텍스트에는 `queryClient`만 넣는다. 컨텍스트를 상태 저장소로 쓰기 시작하면 라우터가 두 번째 상태 관리자가 된다.

## 9. 에러 처리

| 계층 | 처리 |
|---|---|
| 라우트 로드 실패 | `__root`의 `errorComponent` — 재시도 버튼 제공 |
| 404 | `__root`의 `notFoundComponent` |
| 미인증 | `layouts/authed.tsx`의 `beforeLoad`에서 `throw redirect({ to: '/login' })` |
| 이미 인증된 사용자의 `/login` 진입 | `pages/login/route.tsx`의 `beforeLoad`에서 되돌린다 (뒤로가기 대응) |
| API 오류 | TanStack Query의 재시도 정책(`retry: 1`). 소진되면 `useSuspenseQuery`가 던져 위의 `errorComponent`가 받는다 |

## 10. 샘플 화면

구조를 검증하는 데 필요한 최소치만 만든다.

| 경로 | 검증 대상 |
|---|---|
| `/login` | 가드 바깥 라우트, React Hook Form + Zod |
| `/` | index 라우트 → `/users` 리다이렉트 |
| `/users` | 가드 안, ag-grid 목록, loader + query, zustand 필터 |
| `/users/$userId` | 동적 param, `validateSearch`(Zod)로 검증되는 search param |
| (없는 경로) | `notFoundComponent` |

사용자 API는 고정 목 데이터를 반환하는 `shared/api`의 함수로 대체한다. 서버 없이 `pnpm dev`로 바로 돈다.

## 11. 테스트

- **라우터 가드**: 미인증 상태로 `/users` 진입 시 `/login`으로 리다이렉트되는지 (vitest + Testing Library, 메모리 히스토리)
- **search param 검증**: `/users/$userId`에 잘못된 search param이 들어왔을 때의 동작
- **코드 스플리팅 검증**: `pnpm build` 산출물에서 `users` 청크가 초기 진입 청크에 포함되지 않는지 확인. 빌드 후 청크 목록을 검사하는 스크립트로 자동화한다.

## 12. 기술 스택 및 가정

- React 18.3.1, TypeScript (`any` 금지), Vite
- `@tanstack/react-router` v1, `@tanstack/react-query` v5
- 상태: Zustand / 폼: React Hook Form + Zod
- UI: antd 5 + Tailwind CSS (레이아웃은 Tailwind, 컴포넌트는 antd). styled-components는 쓰지 않는다.
- 그리드: ag-grid 33
- 패키지 매니저: pnpm

## 13. 성공 기준

1. `src/routes/` 디렉터리가 없고, 화면 하나가 파일 하나로 표현된다.
2. 새 화면 추가가 `app/routes.ts` 한 줄 + `route.tsx` 한 파일로 끝난다.
3. `pnpm build` 산출물에서 라우트별 청크가 분리되어 있고, 초기 진입 청크에 포함되지 않는다.
4. 애플리케이션 코드에 `React.lazy` / `Suspense` 수동 배선이 없다.
5. 테스트가 통과한다.
