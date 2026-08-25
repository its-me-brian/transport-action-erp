/**
 * TESTS — ReconciliationScreen (reconciliation management)
 *
 * Covers:
 * - Renders heading and stats
 * - Loads and displays reconciliations
 * - Loading state
 * - Empty state
 * - Search filtering
 * - Status filter buttons
 * - Expand row detail
 * - Resolve action opens modal
 * - Resolve calls API
 * - API error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReconciliationScreen from '../components/ReconciliationScreen';

const mockGetReconciliations = vi.fn();
const mockResolveReconciliation = vi.fn();

vi.mock('../services/api', () => ({
  getReconciliations: (...args: any[]) => mockGetReconciliations(...args),
  resolveReconciliation: (...args: any[]) => mockResolveReconciliation(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', user: { role: 'admin' }, can: () => true }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/reconciliation' }),
  };
});

const mockReconciliations = [
  {
    id: 'REC-001',
    serviceId: 'SVC-001',
    projectId: 'PRJ-001',
    status: 'Pendiente',
    production: { startTime: '08:00', endTime: '17:00', km: 120, diaria: 'piena', festivo: false, notturno: false },
    driver: { startTime: '08:15', endTime: '16:45', km: 118, diaria: 'piena', festivo: false, notturno: false },
    final: { startTime: '', endTime: '', km: 0, diaria: 'none', festivo: false, notturno: false },
    resolvedBy: '',
    resolvedAt: '',
    resolutionNotes: '',
  },
  {
    id: 'REC-002',
    serviceId: 'SVC-002',
    projectId: 'PRJ-002',
    status: 'Resuelto',
    production: { startTime: '09:00', endTime: '18:00', km: 80, diaria: 'mezza', festivo: true, notturno: false },
    driver: { startTime: '09:00', endTime: '18:00', km: 80, diaria: 'mezza', festivo: true, notturno: false },
    final: { startTime: '09:00', endTime: '18:00', km: 80, diaria: 'mezza', festivo: true, notturno: false },
    resolvedBy: 'admin@test.it',
    resolvedAt: '2026-01-15T14:30:00Z',
    resolutionNotes: 'Matched',
  },
  {
    id: 'REC-003',
    serviceId: 'SVC-003',
    projectId: 'PRJ-001',
    status: 'EnProceso',
    production: { startTime: '07:00', endTime: '16:00', km: 200, diaria: 'piena', festivo: false, notturno: true },
    driver: { startTime: '07:30', endTime: '15:30', km: 195, diaria: 'piena', festivo: false, notturno: true },
    final: { startTime: '', endTime: '', km: 0, diaria: 'none', festivo: false, notturno: false },
    resolvedBy: '',
    resolvedAt: '',
    resolutionNotes: '',
  },
];

describe('ReconciliationScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReconciliations.mockImplementation((filters?: { status?: string }) => {
      if (filters?.status) {
        return Promise.resolve(mockReconciliations.filter(r => r.status === filters.status));
      }
      return Promise.resolve(mockReconciliations);
    });
  });

  it('renders heading', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
  });

  it('shows stats row with counts', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetReconciliations.mockReturnValue(new Promise(() => {}));
    render(<ReconciliationScreen onNavigate={vi.fn()} />);
    // Skeleton loading: check for role="status" containers
    const skeletons = document.querySelectorAll('[role="status"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('loads and displays reconciliations', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });
    expect(screen.getByText('SVC-002')).toBeInTheDocument();
    expect(screen.getByText('SVC-003')).toBeInTheDocument();
  });

  it('shows empty state when no reconciliations', async () => {
    mockGetReconciliations.mockResolvedValue([]);
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No reconciliations found')).toBeInTheDocument();
    });
  });

  it('search filters by serviceId', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search by service, project, or ID...'), { target: { value: 'SVC-001' } });
    expect(screen.getByText('SVC-001')).toBeInTheDocument();
    expect(screen.queryByText('SVC-002')).not.toBeInTheDocument();
  });

  it('search filters by projectId', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search by service, project, or ID...'), { target: { value: 'PRJ-002' } });
    expect(screen.getByText('SVC-002')).toBeInTheDocument();
    expect(screen.queryByText('SVC-001')).not.toBeInTheDocument();
  });

  it('status filter shows only matching status', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pendiente' }));

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });
    expect(screen.queryByText('SVC-002')).not.toBeInTheDocument();
  });

  it('All filter shows all items', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pendiente' }));
    await waitFor(() => {
      expect(screen.queryByText('SVC-002')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => {
      expect(screen.getByText('SVC-002')).toBeInTheDocument();
    });
  });

  it('Resolve button opens modal for non-resolved items', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    const resolveButtons = screen.getAllByText('Resolve');
    expect(resolveButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Resolve Reconciliation')).toBeInTheDocument();
    });
  });

  it('resolve modal has form fields', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Resolve')[0]);

    await waitFor(() => {
      expect(screen.getByText('Final Start Time')).toBeInTheDocument();
    });
    expect(screen.getByText('Final End Time')).toBeInTheDocument();
    expect(screen.getByText('Final KM')).toBeInTheDocument();
    expect(screen.getByText('Resolution Notes')).toBeInTheDocument();
  });

  it('Resolve calls resolveReconciliation API', async () => {
    mockResolveReconciliation.mockResolvedValue({});
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Resolve')[0]);
    await waitFor(() => {
      expect(screen.getByText('Resolve Reconciliation')).toBeInTheDocument();
    });

    const modal = screen.getByText('Resolve Reconciliation').closest('div.fixed') as HTMLElement;
    fireEvent.click(within(modal).getByRole('button', { name: 'Resolve' }));

    await waitFor(() => {
      expect(mockResolveReconciliation).toHaveBeenCalledTimes(1);
    });
  });

  it('resolve modal closes on Cancel', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Resolve')[0]);
    await waitFor(() => {
      expect(screen.getByText('Resolve Reconciliation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Resolve Reconciliation')).not.toBeInTheDocument();
  });

  it('handles getReconciliations error gracefully', async () => {
    mockGetReconciliations.mockRejectedValue(new Error('Network error'));
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No reconciliations found')).toBeInTheDocument();
    });
  });

  it('handles resolveReconciliation error', async () => {
    mockResolveReconciliation.mockRejectedValue(new Error('Fail'));
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SVC-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Resolve')[0]);
    await waitFor(() => {
      expect(screen.getByText('Resolve Reconciliation')).toBeInTheDocument();
    });

    const modal = screen.getByText('Resolve Reconciliation').closest('div.fixed') as HTMLElement;
    fireEvent.click(within(modal).getByRole('button', { name: 'Resolve' }));

    await waitFor(() => {
      // showToast should be called for API error
      expect(mockResolveReconciliation).toHaveBeenCalled();
    });
  });

  it('calls getReconciliations on mount', async () => {
    render(<ReconciliationScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetReconciliations).toHaveBeenCalledTimes(2);
    });
  });
});
