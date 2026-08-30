import { rootRoute, index, route } from '@tanstack/virtual-file-routes';

/**
 * 라우트 트리 선언.
 *
 * 여기 있는 파일 경로는 vite.config.ts 의 routesDirectory(= ./src/app) 기준이다.
 * 화면을 추가할 때 손대는 곳은 이 파일과 pages/<slice>/route.tsx 둘뿐이다.
 */
export const routes = rootRoute('root.tsx', [
  index('../pages/home-redirect/route.tsx'),
  route('/login', '../pages/login/route.tsx'),
]);
