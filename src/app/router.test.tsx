import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/renderRoute';

describe('가상 라우트 배선', () => {
  it('/ 에서 홈 화면이 렌더된다', async () => {
    renderRoute('/');

    expect(await screen.findByText('홈')).toBeInTheDocument();
  });
});
