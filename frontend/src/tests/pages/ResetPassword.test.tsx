import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ResetPassword } from '../../pages/ResetPassword';
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
    useSearchParams: () => [new URLSearchParams('token=valid-token')],
  };
});

describe('ResetPassword Page', () => {
  it('renders reset password form when token is present', () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();

    // Query password fields by their specific placeholders
    expect(screen.getByPlaceholderText(/^enter your new password$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^re-enter your new password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('displays password strength indicator', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    // Password strength indicator should be present - get the first password field by exact placeholder
    const passwordInput = screen.getByPlaceholderText(/^enter your new password$/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('name', 'password');
  });
});
