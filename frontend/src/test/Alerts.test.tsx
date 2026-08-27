import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Alerts from '@/pages/Alerts';
import { useAppStore } from '@/store/appStore';
import { MOCK_ALERTS } from '@/mocks/data';
import { renderPage } from './utils';

/**
 * The alert feed spans every upload, but the page must show the selected one.
 * Before this was fixed the page rendered all datasets' alerts at once and the
 * dataset switcher changed nothing here.
 */
describe('Alerts page', () => {
  beforeEach(() => useAppStore.getState().setTier('premium'));

  const amazonThemes = MOCK_ALERTS.filter((a) => a.datasetId === 'ds_amazon').map((a) => a.theme);
  const shopifyThemes = MOCK_ALERTS.filter((a) => a.datasetId === 'ds_shopify').map((a) => a.theme);

  it('shows only the selected dataset’s alerts', async () => {
    useAppStore.getState().setDatasetId('ds_amazon');
    renderPage(<Alerts />, { route: '/alerts-page' });

    expect(await screen.findByText(amazonThemes[0], {}, { timeout: 4000 })).toBeInTheDocument();
    for (const theme of shopifyThemes) {
      expect(screen.queryByText(theme)).not.toBeInTheDocument();
    }
  });

  it('follows the dataset switcher', async () => {
    useAppStore.getState().setDatasetId('ds_shopify');
    renderPage(<Alerts />, { route: '/alerts-page' });

    expect(await screen.findByText(shopifyThemes[0], {}, { timeout: 4000 })).toBeInTheDocument();
    for (const theme of amazonThemes) {
      expect(screen.queryByText(theme)).not.toBeInTheDocument();
    }
  });

  it('counts alerts on other uploads rather than hiding them silently', async () => {
    useAppStore.getState().setDatasetId('ds_shopify');
    renderPage(<Alerts />, { route: '/alerts-page' });

    await screen.findByText(shopifyThemes[0], {}, { timeout: 4000 });
    expect(
      screen.getByText(new RegExp(`${amazonThemes.length} more on your other uploads`, 'i')),
    ).toBeInTheDocument();
  });

  it('tells you where the alerts are when this dataset has none', async () => {
    useAppStore.getState().setDatasetId('ds_tiktok');
    renderPage(<Alerts />, { route: '/alerts-page' });

    expect(
      await screen.findByText(/no alerts for this dataset/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/on your other uploads/i)).toBeInTheDocument();
  });
});
