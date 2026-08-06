import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from '@/pages/Register';
import { renderPage } from './utils';

describe('Register page (mock mode)', () => {
  it('rejects short passwords before submitting', async () => {
    const user = userEvent.setup();
    renderPage(<Register />, { route: '/register-page' });

    await user.type(screen.getByLabelText(/your name/i), 'Test Seller');
    await user.type(screen.getByLabelText(/email/i), 'seller@test.co');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create free account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
  });

  it('creates an account and navigates to the app', async () => {
    const user = userEvent.setup();
    renderPage(<Register />, { route: '/register-page' });

    await user.type(screen.getByLabelText(/your name/i), 'Test Seller');
    await user.type(screen.getByLabelText(/email/i), 'seller@test.co');
    await user.type(screen.getByLabelText(/password/i), 'S3cure!pass');
    await user.click(screen.getByRole('button', { name: /create free account/i }));

    expect(await screen.findByText('APP_HOME', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
