import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Upgrade from '@/pages/Upgrade';
import { useAppStore } from '@/store/appStore';
import { renderPage } from './utils';

describe('Upgrade page', () => {
  // The page renders from the perspective of a free-tier account.
  beforeEach(() => useAppStore.getState().setTier('free'));

  it('renders both plans with prices, caps, and the locked feature list', async () => {
    renderPage(<Upgrade />, { route: '/upgrade-page' });

    expect(await screen.findByText('Free', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$29')).toBeInTheDocument();

    // Free plan must advertise what it doesn't include — that's the conversion hook
    expect(screen.getAllByText(/competitor benchmarking/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /activate premium/i })).toBeInTheDocument();
  });

  it('explains that card data never reaches our servers', async () => {
    renderPage(<Upgrade />, { route: '/upgrade-page' });
    expect(await screen.findByText(/stripe checkout/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/never touch our servers/i)).toBeInTheDocument();
  });
});
