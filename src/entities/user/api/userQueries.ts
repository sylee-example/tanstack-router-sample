import { queryOptions } from '@tanstack/react-query';
import { fetchUser, fetchUsers } from './mockUserApi';

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
