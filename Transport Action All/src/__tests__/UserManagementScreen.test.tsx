/**
 * TESTS — UserManagementScreen
 *
 * Covers:
 * - Renders heading and create button
 * - Loads and displays users table
 * - Empty state
 * - Search filtering
 * - Create user modal opens/closes
 * - Edit user modal opens/closes
 * - Approve/Reject actions
 * - Access denied for non-admin
 * - Stats display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import UserManagementScreen from '../components/UserManagementScreen';

const mockGetUsers = vi.fn();
const mockApproveUser = vi.fn();
const mockRejectUser = vi.fn();
const mockUpdateUserRole = vi.fn();
const mockDeleteUser = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('../services/api', () => ({
  getUsers: (...args: any[]) => mockGetUsers(...args),
  approveUser: (...args: any[]) => mockApproveUser(...args),
  rejectUser: (...args: any[]) => mockRejectUser(...args),
  updateUserRole: (...args: any[]) => mockUpdateUserRole(...args),
  deleteUser: (...args: any[]) => mockDeleteUser(...args),
  createUser: (...args: any[]) => mockCreateUser(...args),
  updateUser: (...args: any[]) => mockUpdateUser(...args),
}));

const mockCan = vi.fn(() => true);

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', username: 'admin', role: 'admin' },
    token: 'test-token',
    can: mockCan,
  }),
}));

const mockUsers = [
  {
    id: 'u1',
    username: 'admin',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    status: 'approved',
    lastLogin: '2026-01-15T10:00:00Z',
  },
  {
    id: 'u2',
    username: 'coord1',
    email: 'coord@test.com',
    name: 'Coordinator',
    role: 'coordinator',
    status: 'pending',
    lastLogin: null,
  },
  {
    id: 'u3',
    username: 'driver1',
    email: 'driver@test.com',
    name: 'Driver',
    role: 'driver',
    status: 'rejected',
    lastLogin: '2026-01-10T08:00:00Z',
  },
];

describe('UserManagementScreen', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCan.mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders heading and create button', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetUsers.mockReturnValue(new Promise(() => {}));
    const { container } = render(<UserManagementScreen onNavigate={mockOnNavigate} />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('loads and displays users', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('coord1')).toBeInTheDocument();
    expect(screen.getByText('driver1')).toBeInTheDocument();
  });

  it('shows empty state when no users', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });

  it('computes stats correctly', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('search filters users', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('coord1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search users/), { target: { value: 'driver' } });

    expect(screen.queryByText('coord1')).not.toBeInTheDocument();
    expect(screen.getByText('driver1')).toBeInTheDocument();
  });

  it('shows empty search result message', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('coord1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search users/), { target: { value: 'zzz' } });
    expect(screen.getByText('No users match your search.')).toBeInTheDocument();
  });

  it('Create User button opens modal', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByText('Username *')).toBeInTheDocument();
  });

  it('create modal closes on Cancel', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByText('Create New User')).toBeInTheDocument();

    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
  });

  it('shows approve/reject buttons for pending users', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [mockUsers[1]] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('coord1')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Approve')).toBeInTheDocument();
    expect(screen.getByTitle('Reject')).toBeInTheDocument();
  });

  it('calls approveUser when Approve clicked', async () => {
    mockApproveUser.mockResolvedValue({});
    mockGetUsers.mockResolvedValue({ success: true, users: [mockUsers[1]] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('coord1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Approve'));
    await waitFor(() => {
      expect(mockApproveUser).toHaveBeenCalledWith('test-token', 'u2');
    });
  });

  it('calls rejectUser when Reject clicked', async () => {
    mockRejectUser.mockResolvedValue({});
    mockGetUsers.mockResolvedValue({ success: true, users: [mockUsers[1]] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('coord1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Reject'));
    await waitFor(() => {
      expect(mockRejectUser).toHaveBeenCalledWith('test-token', 'u2');
    });
  });

  it('shows Edit button for all users', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Edit').length).toBe(3);
    });
  });

  it('edit modal opens with user data', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [mockUsers[0]] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByText('Edit User: admin')).toBeInTheDocument();
  });

  it('access denied screen for non-admin', () => {
    mockCan.mockReturnValue(false);
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/You need admin access/)).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('Go to Dashboard navigates', () => {
    mockCan.mockReturnValue(false);
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Go to Dashboard'));
    expect(mockOnNavigate).toHaveBeenCalledWith('transport');
  });

  it('renders table headers when users exist', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [mockUsers[1]] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Last Login')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('calls getUsers on mount', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: [] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledWith('test-token');
    });
  });

  it('shows status badges with correct styling', async () => {
    mockGetUsers.mockResolvedValue({ success: true, users: mockUsers });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('approved')).toBeInTheDocument();
    });
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('delete button is disabled for current user', async () => {
    // Use the same id as the auth user ('u-admin')
    mockGetUsers.mockResolvedValue({ success: true, users: [{ ...mockUsers[0], id: 'u-admin' }] });
    render(<UserManagementScreen onNavigate={mockOnNavigate} />);

    await waitFor(() => {
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete');
    expect(deleteButton).toBeDisabled();
  });
});
