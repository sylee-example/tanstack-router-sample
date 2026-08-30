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
