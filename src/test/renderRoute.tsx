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
