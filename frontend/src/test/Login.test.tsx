import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/pages/Login';
import { renderPage } from './utils';

describe('Login page (mock mode)', () => {
  it('renders the form with email/password fields', () => {
    renderPage(<Login />, { route: '/login-page' });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('signs in and navigates to the app', async () => {
    const user = userEvent.setup();
    renderPage(<Login />, { route: '/login-page' });

    await user.type(screen.getByLabelText(/email/i), 'seller@test.co');
    await user.type(screen.getByLabelText(/password/i), 'S3cure!pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('APP_HOME', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
