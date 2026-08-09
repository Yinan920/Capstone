import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteDataset from '@/components/dashboard/DeleteDataset';
import { renderPage } from './utils';
import type { Dataset } from '@/lib/types';

const DATASET: Dataset = {
  id: 'ds_amazon',
  name: 'Amazon — NovaBrew Go',
  source: 'amazon',
  productName: 'NovaBrew Go Portable Espresso Maker',
  reviewCount: 50,
  createdAt: '2026-07-06T12:00:00Z',
};

describe('DeleteDataset', () => {
  it('does not delete on the first click — it asks first', async () => {
    const user = userEvent.setup();
    renderPage(<DeleteDataset dataset={DATASET} />, { route: '/dash' });

    await user.click(screen.getByRole('button', { name: /delete dataset/i }));

    expect(screen.getByText(/delete this dataset and its analysis\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancel returns to the idle button without deleting', async () => {
    const user = userEvent.setup();
    renderPage(<DeleteDataset dataset={DATASET} />, { route: '/dash' });

    await user.click(screen.getByRole('button', { name: /delete dataset/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('button', { name: /delete dataset/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /yes, delete/i })).not.toBeInTheDocument();
  });

  it('confirming clears the selected dataset', async () => {
    const user = userEvent.setup();
    const { useAppStore } = await import('@/store/appStore');
    useAppStore.getState().setDatasetId('ds_amazon');

    renderPage(<DeleteDataset dataset={DATASET} />, { route: '/dash' });
    await user.click(screen.getByRole('button', { name: /delete dataset/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));

    // Selection is released so the switcher falls back to whatever remains.
    await new Promise((r) => setTimeout(r, 900));
    expect(useAppStore.getState().datasetId).toBe('');
  });
});
