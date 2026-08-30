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
