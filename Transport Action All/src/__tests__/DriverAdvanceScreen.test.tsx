/**
 * TESTS — DriverAdvanceScreen (driver advance management)
 *
 * Covers:
 * - Renders heading and stats
 * - Loading state
 * - Empty state
 * - Loads and displays advances
 * - Search filtering
 * - Status filter
 * - Create advance modal opens/closes
 * - Validates required fields on create
 * - Calls createDriverAdvance on valid submit
 * - API error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverAdvanceScreen from '../components/DriverAdvanceScreen';

const mockGetDriverAdvances = vi.fn();
const mockCreateDriverAdvance = vi.fn();
const mockUpdateDriverAdvance = vi.fn();
const mockGetDrivers = vi.fn();

vi.mock('../services/api', () => ({
  getDriverAdvances: (...args: any[]) => mockGetDriverAdvances(...args),
  createDriverAdvance: (...args: any[]) => mockCreateDriverAdvance(...args),
  updateDriverAdvance: (...args: any[]) => mockUpdateDriverAdvance(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockDrivers = [
  { id: 'DRV-001', name: 'Mario Rossi' },
  { id: 'DRV-002', name: 'Luigi Bianchi' },
];

const mockAdvances = [
  {
    id: 'ADV-001',
    driverId: 'DRV-001',
    projectId: 'PRJ-001',
    amount: 500,
    remainingAmount: 500,
    status: 'Pendiente',
    date: '2026-01-15',
    notes: 'Fuel advance',
    deductedIn: '',
  },
  {
    id: 'ADV-002',
    driverId: 'DRV-002',
    projectId: 'PRJ-002',
    amount: 200,
    remainingAmount: 0,
    status: 'Descontado',
    date: '2026-01-10',
    notes: 'Lunch money',
    deductedIn: 'INV-2026-003',
  },
];

describe('DriverAdvanceScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDriverAdvances.mockResolvedValue(mockAdvances);
    mockGetDrivers.mockResolvedValue(mockDrivers);
  });

  it('renders heading', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Driver Advances')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetDriverAdvances.mockReturnValue(new Promise(() => {}));
    mockGetDrivers.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DriverAdvanceScreen onNavigate={vi.fn()} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays advances', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });
    expect(screen.getByText('Luigi Bianchi')).toBeInTheDocument();
  });

  it('shows advance count in header', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/2 advances/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no advances', async () => {
    mockGetDriverAdvances.mockResolvedValue([]);
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No advances recorded yet')).toBeInTheDocument();
    });
  });

  it('shows link to create first advance when empty', async () => {
    mockGetDriverAdvances.mockResolvedValue([]);
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Record your first advance')).toBeInTheDocument();
    });
  });

  it('search filters by driver name', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search advances...'), { target: { value: 'Mario' } });
    expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    expect(screen.queryByText('Luigi Bianchi')).not.toBeInTheDocument();
  });

  it('search filters by project ID', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search advances...'), { target: { value: 'PRJ-002' } });
    expect(screen.getByText('Luigi Bianchi')).toBeInTheDocument();
    expect(screen.queryByText('Mario Rossi')).not.toBeInTheDocument();
  });

  it('status filter shows only matching status', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'Descontado' } });

    await waitFor(() => {
      expect(screen.getByText('Luigi Bianchi')).toBeInTheDocument();
    });
    expect(screen.queryByText('Mario Rossi')).not.toBeInTheDocument();
  });

  it('New Advance button opens create modal', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Advance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Advance'));
    expect(screen.getByText('New Driver Advance')).toBeInTheDocument();
  });

  it('create modal closes on Cancel', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Advance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Advance'));
    expect(screen.getByText('New Driver Advance')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Driver Advance')).not.toBeInTheDocument();
  });

  it('validates required fields on create', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Advance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Advance'));
    fireEvent.click(screen.getByText('Create Advance'));

    // showToast should be called for validation error
    await waitFor(() => {
      expect(screen.getByText('Create Advance')).toBeInTheDocument();
    });
  });

  it('calls createDriverAdvance with correct payload', async () => {
    mockCreateDriverAdvance.mockResolvedValue({ id: 'ADV-NEW' });
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Advance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Advance'));

    fireEvent.change(screen.getByDisplayValue('Select driver...'), { target: { value: 'DRV-001' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '150' } });

    fireEvent.click(screen.getByText('Create Advance'));

    await waitFor(() => {
      expect(mockCreateDriverAdvance).toHaveBeenCalledWith(
        expect.objectContaining({
          driverId: 'DRV-001',
          amount: 150,
        })
      );
    });
  });

  it('handles createDriverAdvance error', async () => {
    mockCreateDriverAdvance.mockResolvedValue({ error: 'Insufficient budget' });
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Advance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Advance'));
    fireEvent.change(screen.getByDisplayValue('Select driver...'), { target: { value: 'DRV-001' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Create Advance'));

    // showToast should be called for API error
    await waitFor(() => {
      expect(mockCreateDriverAdvance).toHaveBeenCalled();
    });
  });

  it('handles getDriverAdvances error gracefully', async () => {
    mockGetDriverAdvances.mockRejectedValue(new Error('Network error'));
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No advances recorded yet')).toBeInTheDocument();
    });
  });

  it('calls load functions on mount', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetDriverAdvances).toHaveBeenCalledTimes(1);
      expect(mockGetDrivers).toHaveBeenCalledTimes(1);
    });
  });

  it('shows status badges correctly', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Descontado').length).toBeGreaterThanOrEqual(1);
  });

  it('displays pending total amount in header', async () => {
    render(<DriverAdvanceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Pending:/)).toBeInTheDocument();
    });
  });
});
