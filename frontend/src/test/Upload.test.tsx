import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Upload from '@/pages/Upload';
import { renderPage } from './utils';

const CSV = new File(['author,rating,text,created_at\nA,5,"Great",2026-07-01T10:00:00Z\n'], 'reviews.csv', {
  type: 'text/csv',
});

describe('Upload page (mock mode)', () => {
  it('requires a file before submitting', async () => {
    const user = userEvent.setup();
    renderPage(<Upload />, { route: '/upload-page' });

    await user.type(screen.getByLabelText(/dataset name/i), 'Amazon — NovaBrew Go');
    await user.type(screen.getByLabelText(/product name/i), 'NovaBrew Go Espresso Maker');
    await user.click(screen.getByRole('button', { name: /upload & analyze/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/choose a csv file/i);
  });

  it('uploads, shows analysis progress, and finishes', async () => {
    const user = userEvent.setup();
    renderPage(<Upload />, { route: '/upload-page' });

    await user.upload(screen.getByLabelText(/click to choose a csv file/i), CSV);
    await user.type(screen.getByLabelText(/dataset name/i), 'Amazon — NovaBrew Go');
    await user.type(screen.getByLabelText(/product name/i), 'NovaBrew Go Espresso Maker');
    await user.selectOptions(screen.getByLabelText(/sales channel/i), 'amazon');
    await user.click(screen.getByRole('button', { name: /upload & analyze/i }));

    // Mock pipeline: queued → running (progress bar) → done.
    expect(await screen.findByText(/analyzing your reviews/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText(/analysis complete/i, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view insights dashboard/i })).toBeInTheDocument();
  }, 15000);
});
