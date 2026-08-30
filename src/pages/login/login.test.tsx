import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/renderRoute';
import { useSessionStore } from '@/entities/session';

describe('로그인 화면', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('아이디가 비어 있으면 검증 메시지를 보여준다', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.click(await screen.findByRole('button', { name: '로그인' }));

    expect(await screen.findByText('아이디를 입력하세요')).toBeInTheDocument();
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('아이디를 넣고 제출하면 세션이 생긴다', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.type(await screen.findByLabelText('아이디'), '김서연');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await vi.waitFor(() => {
      expect(useSessionStore.getState().user?.name).toBe('김서연');
    });
  });
});
