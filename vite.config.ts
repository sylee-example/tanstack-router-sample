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
