import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ForgotPassword } from '../../pages/ForgotPassword';
import '@testing-library/jest-dom';

vi.mock('../../lib/api-client', () => ({
  getApiClient: () => ({
    post: vi.fn().mockResolvedValue({}),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form', () => {
    render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('renders back to login link', () => {
    render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );

    const backLink = screen.getByRole('link', { name: /back to login/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/login');
  });
});
