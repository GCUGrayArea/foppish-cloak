import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Register } from '../../pages/Register';
import { AuthProvider } from '../../lib/auth-context';
import '@testing-library/jest-dom';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  getApiClient: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
  initializeApiClient: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderRegister() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders registration form with all required fields', () => {
    renderRegister();

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/firm name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('displays password strength indicator when typing password', async () => {
    const user = userEvent.setup();
    renderRegister();

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'Weak1!');

    await waitFor(() => {
      expect(screen.getByText(/password must contain/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation matches', async () => {
    const user = userEvent.setup();
    renderRegister();

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmInput, 'DifferentPassword123!');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('renders link to login page', () => {
    renderRegister();

    const loginLink = screen.getByRole('link', { name: /sign in here/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('displays terms of service and privacy policy links', () => {
    renderRegister();

    const termsLink = screen.getByRole('link', { name: /terms of service/i });
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });

    expect(termsLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();
  });
});
