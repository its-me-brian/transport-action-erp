/**
 * TESTS — AuthScreen (Login + Register)
 *
 * Covers:
 * - Login form rendering
 * - Login success / failure
 * - Register form rendering
 * - Register validation (password match, min length)
 * - Register success / failure
 * - Toggle between login / register modes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AuthScreen from '../components/AuthScreen';

// Mock useAuth
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // LOGIN
  // =========================================================================
  describe('Login mode', () => {
    it('renders login form by default', () => {
      render(<AuthScreen />);
      // "Sign In" appears in tab AND submit button — check both exist
      const signInElements = screen.getAllByText('Sign In');
      expect(signInElements.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('calls login with username and password', async () => {
      mockLogin.mockResolvedValue({ success: true });
      render(<AuthScreen />);

      fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'admin' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'pass123' } });
      // Click the submit button (second "Sign In" element)
      const signInButtons = screen.getAllByText('Sign In');
      fireEvent.click(signInButtons[signInButtons.length - 1]);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin', 'pass123');
      });
    });

    it('shows error on login failure', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      render(<AuthScreen />);

      fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'admin' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } });
      const signInButtons = screen.getAllByText('Sign In');
      fireEvent.click(signInButtons[signInButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('handles object error from backend', async () => {
      mockLogin.mockResolvedValue({ success: false, error: { message: 'Token expired' } });
      render(<AuthScreen />);

      fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'admin' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'pass' } });
      const signInButtons = screen.getAllByText('Sign In');
      fireEvent.click(signInButtons[signInButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Token expired')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // REGISTER
  // =========================================================================
  describe('Register mode', () => {
    it('switches to register mode', () => {
      render(<AuthScreen />);
      fireEvent.click(screen.getByText('Register', { selector: 'button' }));

      expect(screen.getByText('Username *')).toBeInTheDocument();
      expect(screen.getByText('Email *')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    it('validates password mismatch', async () => {
      render(<AuthScreen />);
      fireEvent.click(screen.getByText('Register', { selector: 'button' }));

      fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: '+34600000000' } });
      fireEvent.change(screen.getByPlaceholderText('Min 6 characters'), { target: { value: 'pass123' } });
      fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'pass456' } });
      fireEvent.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('validates password min length', async () => {
      render(<AuthScreen />);
      fireEvent.click(screen.getByText('Register', { selector: 'button' }));

      fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: '+34600000000' } });
      fireEvent.change(screen.getByPlaceholderText('Min 6 characters'), { target: { value: '12345' } });
      fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: '12345' } });
      fireEvent.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('calls register with correct data on valid input', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Registration successful' });
      render(<AuthScreen />);
      fireEvent.click(screen.getByText('Register', { selector: 'button' }));

      fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: '+34600000000' } });
      fireEvent.change(screen.getByPlaceholderText('Min 6 characters'), { target: { value: 'pass123' } });
      fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'test@test.com',
          phone: '+34600000000',
          password: 'pass123',
        });
      });
    });

    it('shows success message on successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true, message: 'Waiting for approval' });
      render(<AuthScreen />);
      fireEvent.click(screen.getByText('Register', { selector: 'button' }));

      fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: '+34600000000' } });
      fireEvent.change(screen.getByPlaceholderText('Min 6 characters'), { target: { value: 'pass123' } });
      fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TOGGLE
  // =========================================================================
  describe('Mode toggle', () => {
    it('toggles between login and register', () => {
      render(<AuthScreen />);
      expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByText('Register', { selector: 'button' }));
      expect(screen.getByText('Create Account')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Sign In', { selector: 'button' }));
      expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);
    });
  });
});
