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
