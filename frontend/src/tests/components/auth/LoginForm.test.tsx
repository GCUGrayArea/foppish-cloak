import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../../components/auth/LoginForm';
import { AuthProvider } from '../../../lib/auth-context';
import '@testing-library/jest-dom';

vi.mock('../../../lib/api-client', () => ({
  getApiClient: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
  initializeApiClient: vi.fn(),
}));

function renderLoginForm(onSuccess = vi.fn()) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginForm onSuccess={onSuccess} />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all form fields', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');
  });

  it('handles remember me checkbox', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const checkbox = screen.getByRole('checkbox', { name: /remember me/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
