import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Dashboard from '@/pages/Dashboard';
import { renderPage } from './utils';

describe('Dashboard page (mock mode)', () => {
  it('renders KPI tiles and complaint themes after loading', async () => {
    renderPage(<Dashboard />, { route: '/dashboard-page' });

    expect(await screen.findByText(/reviews analyzed/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getAllByText(/net sentiment/i)).not.toHaveLength(0);
    expect(await screen.findAllByText(/packaging damage/i)).not.toHaveLength(0);
  });
});
