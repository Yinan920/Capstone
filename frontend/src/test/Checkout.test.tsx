import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Checkout from '@/pages/Checkout';
import { useAppStore } from '@/store/appStore';
import { renderPage } from './utils';

describe('Checkout page', () => {
  beforeEach(() => useAppStore.getState().setTier('free'));

  it('summarises the plan and shows the list price', async () => {
    renderPage(<Checkout />, { route: '/checkout-page' });

    expect(await screen.findByText(/what you get/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/list price \$29\/mo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activate premium/i })).toBeInTheDocument();
  });

  it('states plainly that nothing is charged', async () => {
    renderPage(<Checkout />, { route: '/checkout-page' });

    expect(
      await screen.findByText(/no payment is collected/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/billing itself is not built|not billing/i)).toBeInTheDocument();
    // The amount actually charged must be shown, and must be zero.
    expect(screen.getByText(/charged today/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });

  it('offers no payment method to choose between', async () => {
    renderPage(<Checkout />, { route: '/checkout-page' });
    await screen.findByText(/what you get/i, {}, { timeout: 4000 });

    // The page used to render a card/PayPal/Apple Pay selector that did
    // nothing — no request carried the choice. Picking a payment method you
    // cannot pay with is theatre, so there is nothing to pick.
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByText(/paypal|apple pay/i)).not.toBeInTheDocument();
  });

  it('has no card number or CVV input anywhere', async () => {
    const { container } = renderPage(<Checkout />, { route: '/checkout-page' });
    await screen.findByText(/what you get/i, {}, { timeout: 4000 });

    // No billing integration exists, so this page must never ask for card
    // data. Assert on form controls rather than prose — the explanatory banner
    // legitimately mentions card data while saying we never receive it.
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(container.querySelectorAll('[autocomplete^="cc-"]')).toHaveLength(0);
  });
});
