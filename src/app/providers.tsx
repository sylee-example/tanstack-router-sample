import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

export const AppProviders = ({ queryClient, children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider locale={koKR} theme={{ token: { colorPrimary: '#1677ff' } }}>
      {children}
    </ConfigProvider>
  </QueryClientProvider>
);
