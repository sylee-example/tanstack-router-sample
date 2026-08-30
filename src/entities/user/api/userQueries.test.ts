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
