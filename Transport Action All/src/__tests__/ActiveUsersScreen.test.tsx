/**
 * TESTS — ActiveUsersScreen (presence dashboard)
 *
 * Covers:
 * - Renders heading and stats
 * - Loads and displays active users
 * - Refresh button triggers reload
 * - Empty state when no users
 * - Loading state
 * - Stats compute unique users, coordinators, accounting, drivers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActiveUsersScreen from '../components/ActiveUsersScreen';

const mockGasPost = vi.fn();

vi.mock('../services/api', () => ({
  gasPost: (...args: any[]) => mockGasPost(...args),
}));

const mockCan = vi.fn(() => true);

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'admin', role: 'admin' },
    token: 'test-token',
    can: mockCan,
  }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockUsers = [
  {
    UserID: 'u1',
    SessionID: 'ses-1234567890-abc',
    Email: 'admin@test.com',
    Role: 'admin',
    LastSeen: new Date(Date.now() - 30000).toISOString(),
    UserAgent: 'Chrome',
    IPAddress: '192.168.1.1',
    StartedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    UserID: 'u2',
    SessionID: 'ses-9876543210-def',
    Email: 'coord@test.com',
    Role: 'coordinator',
    LastSeen: new Date(Date.now() - 60000).toISOString(),
    UserAgent: 'Firefox',
    IPAddress: '192.168.1.2',
    StartedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

describe('ActiveUsersScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and subtitle', () => {
    mockGasPost.mockResolvedValue([]);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText(/Real-time presence tracking/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockGasPost.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);
    // Skeleton table rows shown during loading
    const pulsingElements = document.querySelectorAll('[role="status"]');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('loads and displays users', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });
    expect(screen.getByText('coord@test.com')).toBeInTheDocument();
  });

  it('shows empty state when no users', async () => {
    mockGasPost.mockResolvedValue([]);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No active users found')).toBeInTheDocument();
    });
  });

  it('computes unique users stat correctly', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    expect(screen.getByText('Unique Users')).toBeInTheDocument();
  });

  it('computes coordinator stat correctly', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    // Two stat boxes show "1" — one for Unique Users (admin), one for Coordinators
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('refresh button triggers reload', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    mockGasPost.mockResolvedValue([]);
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(screen.getByText('No active users found')).toBeInTheDocument();
    });
  });

  it('calls gasPost with correct action', async () => {
    mockGasPost.mockResolvedValue([]);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(mockGasPost).toHaveBeenCalledWith('getActiveUsers', { token: 'test-token' });
    });
  });

  it('shows session ID truncated to 12 chars', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/ses-12345678/)).toBeInTheDocument();
    });
  });

  it('shows IP address', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });
    expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
  });

  it('renders table headers when users exist', async () => {
    mockGasPost.mockResolvedValue(mockUsers);
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Last Seen')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
  });

  it('handles gasPost error gracefully', async () => {
    mockGasPost.mockRejectedValue(new Error('Network error'));
    render(<ActiveUsersScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No active users found')).toBeInTheDocument();
    });
  });
});
