import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from '../../../components/auth/RegisterForm';
import { AuthProvider } from '../../../lib/auth-context';
import '@testing-library/jest-dom';

vi.mock('../../../lib/api-client', () => ({
  getApiClient: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
  initializeApiClient: vi.fn(),
}));

function renderRegisterForm(onSuccess = vi.fn()) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegisterForm onSuccess={onSuccess} />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('RegisterForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all form fields', () => {
    renderRegisterForm();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/firm name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows password strength indicator when typing', async () => {
    const user = userEvent.setup();
    renderRegisterForm();

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'Test');

    await waitFor(() => {
      expect(screen.getByText(/password must contain/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    renderRegisterForm();

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmInput, 'DifferentPassword123!');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('displays terms and privacy links', () => {
    renderRegisterForm();

    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });
});
