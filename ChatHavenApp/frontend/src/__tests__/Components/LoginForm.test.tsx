import React from 'react';
// Import jest-dom matchers explicitly
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '../../testUtils';
import LoginForm from '../../Components/LoginForm.tsx';
import { login } from '../../Services/authService.ts';
import { mockNavigate } from '../../testUtils';

// Mock the authService
jest.mock('../../Services/authService');
const mockLogin = login as jest.MockedFunction<typeof login>;

// Mock react-router-dom's useNavigate (already done in testUtils, but included here for clarity)
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaEye: () => <span data-testid="eye-icon">👁️</span>,
  FaEyeSlash: () => <span data-testid="eye-slash-icon">🔒</span>
}));

describe('LoginForm.tsx', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders correctly', () => {
    render(<LoginForm />);

    // Check if all elements are rendered
    expect(screen.getByText('Login to ChatHaven')).toBeInTheDocument();
    expect(screen.getByLabelText(/Username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
  });

  it('handles form submission correctly on success', async () => {
    // Mock successful login
    mockLogin.mockResolvedValueOnce({ token: 'test-token' });

    render(<LoginForm />);

    // Fill in form
    fireEvent.change(screen.getByLabelText(/Username:/i), {
      target: { value: 'testuser' }
    });

    fireEvent.change(screen.getByLabelText(/Password:/i), {
      target: { value: 'password123' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    // Verify login was called with correct arguments
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');

    // Wait for navigation and localStorage updates
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on login failure', async () => {
    // Mock failed login
    mockLogin.mockRejectedValueOnce(new Error('Invalid username or password'));

    render(<LoginForm />);

    // Fill in form
    fireEvent.change(screen.getByLabelText(/Username:/i), {
      target: { value: 'testuser' }
    });

    fireEvent.change(screen.getByLabelText(/Password:/i), {
      target: { value: 'wrongpassword' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Password:/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find and click the eye icon or its container
    const toggleButton = screen.getByTestId('eye-icon').closest('span') as HTMLElement;
    fireEvent.click(toggleButton);

    // Password should now be visible
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
