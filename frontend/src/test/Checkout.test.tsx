import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkout from '@/pages/Checkout';
import { useAppStore } from '@/store/appStore';
import { renderPage } from './utils';

describe('Checkout page', () => {
  beforeEach(() => useAppStore.getState().setTier('free'));

  it('shows the order summary and the three payment methods', async () => {
    renderPage(<Checkout />, { route: '/checkout-page' });

    expect(await screen.findByText(/order summary/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/total due today/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$29\.00/).length).toBeGreaterThan(0);

    expect(screen.getByRole('radio', { name: /credit or debit card/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /paypal/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /apple pay/i })).toBeInTheDocument();
  });

  it('lets the buyer switch payment method', async () => {
    const user = userEvent.setup();
    renderPage(<Checkout />, { route: '/checkout-page' });

    const card = await screen.findByRole('radio', { name: /credit or debit card/i }, { timeout: 4000 });
    const paypal = screen.getByRole('radio', { name: /paypal/i });
    expect(card).toHaveAttribute('aria-checked', 'true');

    await user.click(paypal);
    expect(paypal).toHaveAttribute('aria-checked', 'true');
    expect(card).toHaveAttribute('aria-checked', 'false');
  });

  it('states it is a demo and collects no card details', async () => {
    renderPage(<Checkout />, { route: '/checkout-page' });

    expect(await screen.findByText(/demonstration checkout/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(/never touch sellersense servers/i)).toBeInTheDocument();
    expect(screen.getByText(/collects no payment details/i)).toBeInTheDocument();
  });

  it('has no card number or CVV input anywhere', async () => {
    const { container } = renderPage(<Checkout />, { route: '/checkout-page' });
    await screen.findByText(/order summary/i, {}, { timeout: 4000 });

    // The whole point of hosted checkout: this page must never ask for card
    // data. Assert on form controls rather than prose — the explanatory banner
    // legitimately mentions card numbers while saying we don't receive them.
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(container.querySelectorAll('[autocomplete^="cc-"]')).toHaveLength(0);
  });
});
