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
