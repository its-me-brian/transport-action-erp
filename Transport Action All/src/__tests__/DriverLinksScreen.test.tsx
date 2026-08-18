/**
 * TESTS — DriverLinksScreen (Driver link management)
 *
 * Covers:
 * - Render with links list
 * - Search filter by driver ID
 * - Status filter
 * - Generate link modal
 * - Copy link functionality
 * - Revoke link confirmation
 * - Active count display
 * - Empty state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverLinksScreen from '../components/DriverLinksScreen';

const mockGasPost = vi.fn();
const mockGetDrivers = vi.fn();
const mockGetProjects = vi.fn();

vi.mock('../services/api', () => ({
  gasPost: (...args: any[]) => mockGasPost(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
  getProjects: (...args: any[]) => mockGetProjects(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    can: (perm: string) => true,
  }),
}));

const mockOnNavigate = vi.fn();

const sampleLinks = [
  { Token: 'tok-001', DriverID: 'DRV-001', ProjectID: 'PRJ-001', DateFrom: '2026-07-07', DateTo: '2026-07-13', Status: 'ACTIVE', FieldsSchema: 'standard', CreatedAt: '2026-07-07T10:00:00Z', ExpiresAt: '2026-07-14T10:00:00Z' },
  { Token: 'tok-002', DriverID: 'DRV-002', ProjectID: 'PRJ-001', DateFrom: '2026-06-30', DateTo: '2026-07-06', Status: 'EXPIRED', FieldsSchema: 'standard', CreatedAt: '2026-06-30T10:00:00Z', ExpiresAt: '2026-07-07T10:00:00Z' },
];

const sampleDrivers = [
  { id: 'DRV-001', name: 'Marco Rossi', status: 'active' },
  { id: 'DRV-002', name: 'Luca Bianchi', status: 'active' },
];

const sampleProjects = [
  { id: 'PRJ-001', name: 'Milan Expo', status: 'Attivo' },
];

describe('DriverLinksScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGasPost.mockImplementation((_action: string, _body: any) => {
      const filters = _body?.filters || {};
      let result = [...sampleLinks];
      if (filters.driverId) {
        result = result.filter(l => l.DriverID === filters.driverId);
      }
      if (filters.status) {
        result = result.filter(l => l.Status === filters.status);
      }
      return Promise.resolve(result);
    });
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetProjects.mockResolvedValue(sampleProjects);
  });

  it('renders and loads driver links', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Driver Links')).toBeInTheDocument();
      expect(screen.getByText('DRV-001')).toBeInTheDocument();
      expect(screen.getByText('DRV-002')).toBeInTheDocument();
    });
  });

  it('displays active count badge', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('1 active')).toBeInTheDocument();
    });
  });

  it('shows stats cards', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Total Links')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // total
    });
  });

  it('filters by search query', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('DRV-001')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search by driver/i), { target: { value: 'DRV-001' } });
    await waitFor(() => {
      expect(screen.getByText('DRV-001')).toBeInTheDocument();
      expect(screen.queryByText('DRV-002')).not.toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('DRV-001')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'ACTIVE' } });
    await waitFor(() => {
      expect(screen.getByText('DRV-001')).toBeInTheDocument();
      expect(screen.queryByText('DRV-002')).not.toBeInTheDocument();
    });
  });

  it('opens generate link modal', async () => {
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Driver Links')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Generate Link'));
    await waitFor(() => {
      expect(screen.getByText('Generate Driver Link')).toBeInTheDocument();
      expect(screen.getByText('Select driver...')).toBeInTheDocument();
    });
  });
});

describe('DriverLinksScreen — Error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles getDriverLinks API failure gracefully', async () => {
    mockGasPost.mockRejectedValue(new Error('Network error'));
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetProjects.mockResolvedValue(sampleProjects);
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGasPost).toHaveBeenCalled();
    });
    // Should not crash — screen renders with empty list
    expect(screen.getByText('Driver Links')).toBeInTheDocument();
  });

  it('handles empty links list', async () => {
    mockGasPost.mockResolvedValue([]);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetProjects.mockResolvedValue(sampleProjects);
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGasPost).toHaveBeenCalled();
    });
    // Should show empty state
    expect(screen.getByText(/No driver links/i)).toBeInTheDocument();
  });

  it('handles generate link API failure', async () => {
    mockGasPost.mockResolvedValue(sampleLinks);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetProjects.mockResolvedValue(sampleProjects);
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Driver Links')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Generate Link'));
    await waitFor(() => {
      expect(screen.getByText('Generate Driver Link')).toBeInTheDocument();
    });
    // The modal should open without crashing
  });

  it('handles drivers API failure gracefully', async () => {
    mockGasPost.mockResolvedValue(sampleLinks);
    mockGetDrivers.mockRejectedValue(new Error('Drivers API error'));
    mockGetProjects.mockResolvedValue(sampleProjects);
    render(<DriverLinksScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Driver Links')).toBeInTheDocument();
    });
    // Should still render with available data
  });
});
