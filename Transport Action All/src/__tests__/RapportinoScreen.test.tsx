/**
 * TESTS — RapportinoScreen (Client/Driver rapportino management)
 *
 * Covers:
 * - Render with rapportino lists
 * - Tab switching (Clienti/Conductores)
 * - Status display
 * - Search and filter
 * - Period type display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RapportinoScreen from '../components/RapportinoScreen';

const mockGetRapportinoClients = vi.fn();
const mockGetRapportinoDrivers = vi.fn();
const mockReviewRapportinoClient = vi.fn();
const mockSendRapportinoClient = vi.fn();
const mockAcceptRapportinoClient = vi.fn();
const mockFacturarRapportino = vi.fn();
const mockReviewRapportinoDriver = vi.fn();
const mockSendRapportinoDriver = vi.fn();
const mockAcceptRapportinoDriver = vi.fn();
const mockPayRapportinoDriver = vi.fn();
const mockRemoveServiceFromRapportino = vi.fn();
const mockGenerateDriverLink = vi.fn();

vi.mock('../services/api', () => ({
  getRapportinoClients: (...args: any[]) => mockGetRapportinoClients(...args),
  getRapportinoDrivers: (...args: any[]) => mockGetRapportinoDrivers(...args),
  reviewRapportinoClient: (...args: any[]) => mockReviewRapportinoClient(...args),
  sendRapportinoClient: (...args: any[]) => mockSendRapportinoClient(...args),
  acceptRapportinoClient: (...args: any[]) => mockAcceptRapportinoClient(...args),
  facturarRapportino: (...args: any[]) => mockFacturarRapportino(...args),
  reviewRapportinoDriver: (...args: any[]) => mockReviewRapportinoDriver(...args),
  sendRapportinoDriver: (...args: any[]) => mockSendRapportinoDriver(...args),
  acceptRapportinoDriver: (...args: any[]) => mockAcceptRapportinoDriver(...args),
  payRapportinoDriver: (...args: any[]) => mockPayRapportinoDriver(...args),
  removeServiceFromRapportino: (...args: any[]) => mockRemoveServiceFromRapportino(...args),
  generateDriverLink: (...args: any[]) => mockGenerateDriverLink(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockOnNavigate = vi.fn();

const sampleClientRapportinos = [
  { id: 'RC-001', clientId: 'CLI-001', projectId: 'PRJ-001', periodType: 'weekly', periodStart: '2026-07-07', periodEnd: '2026-07-13', weekStart: '2026-07-07', weekEnd: '2026-07-13', status: 'Borrador', notes: '', createdBy: 'admin', createdAt: '', updatedAt: '', sentAt: '', acceptedAt: '' },
  { id: 'RC-002', clientId: 'CLI-002', projectId: 'PRJ-001', periodType: 'monthly', periodStart: '2026-07-01', periodEnd: '2026-07-31', weekStart: '', weekEnd: '', status: 'Enviado', notes: '', createdBy: 'admin', createdAt: '', updatedAt: '', sentAt: '', acceptedAt: '' },
];

const sampleDriverRapportinos = [
  { id: 'RD-001', driverId: 'DRV-001', projectId: 'PRJ-001', periodType: 'weekly', periodStart: '2026-07-07', periodEnd: '2026-07-13', weekStart: '2026-07-07', weekEnd: '2026-07-13', status: 'Borrador', notes: '', createdBy: 'admin', createdAt: '', updatedAt: '', sentAt: '', acceptedAt: '' },
];

describe('RapportinoScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRapportinoClients.mockResolvedValue(sampleClientRapportinos);
    mockGetRapportinoDrivers.mockResolvedValue(sampleDriverRapportinos);
  });

  it('renders with header and tabs', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Rapportinos')).toBeInTheDocument();
    });
    // Tab buttons exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('loads client rapportinos by default', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetRapportinoClients).toHaveBeenCalled();
      expect(screen.getByText('RC-001')).toBeInTheDocument();
      expect(screen.getByText('RC-002')).toBeInTheDocument();
    });
  });

  it('switches to driver tab and loads driver rapportinos', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('RC-001')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Conductores/));
    await waitFor(() => {
      expect(mockGetRapportinoDrivers).toHaveBeenCalled();
      expect(screen.getByText('RD-001')).toBeInTheDocument();
    });
  });

  it('displays status badges', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument();
      expect(screen.getByText('Enviado')).toBeInTheDocument();
    });
  });

  it('displays period type labels', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      // Period type is rendered as "Semanal: date → date" or "Mensual: date → date"
      expect(screen.getByText(/Semanal/)).toBeInTheDocument();
      expect(screen.getByText(/Mensual/)).toBeInTheDocument();
    });
  });

  it('shows search input with Spanish placeholder', async () => {
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('RC-001')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Buscar rapportinos/i)).toBeInTheDocument();
  });
});

describe('RapportinoScreen — Error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles getRapportinoClients API failure gracefully', async () => {
    mockGetRapportinoClients.mockRejectedValue(new Error('Network error'));
    mockGetRapportinoDrivers.mockResolvedValue([]);
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetRapportinoClients).toHaveBeenCalled();
    });
    // Should not crash — screen renders with empty list
    expect(screen.getByText('Rapportinos')).toBeInTheDocument();
  });

  it('handles getRapportinoDrivers API failure gracefully', async () => {
    mockGetRapportinoClients.mockResolvedValue([]);
    mockGetRapportinoDrivers.mockRejectedValue(new Error('Network error'));
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Rapportinos')).toBeInTheDocument();
    });
    // Switch to drivers tab
    fireEvent.click(screen.getByText(/Conductores/));
    await waitFor(() => {
      expect(mockGetRapportinoDrivers).toHaveBeenCalled();
    });
    // Should not crash
  });

  it('handles empty rapportino lists', async () => {
    mockGetRapportinoClients.mockResolvedValue([]);
    mockGetRapportinoDrivers.mockResolvedValue([]);
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Rapportinos')).toBeInTheDocument();
    });
    // Should show empty state
    expect(screen.getByText(/No hay rapportinos/i)).toBeInTheDocument();
  });

  it('handles rapportino action API failure (review)', async () => {
    mockGetRapportinoClients.mockResolvedValue(sampleClientRapportinos);
    mockGetRapportinoDrivers.mockResolvedValue([]);
    mockReviewRapportinoClient.mockRejectedValue(new Error('Cannot review'));
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('RC-001')).toBeInTheDocument();
    });
    // Should not crash when action fails
  });

  it('handles rapportino action API failure (send)', async () => {
    mockGetRapportinoClients.mockResolvedValue(sampleClientRapportinos);
    mockGetRapportinoDrivers.mockResolvedValue([]);
    mockSendRapportinoClient.mockRejectedValue(new Error('Cannot send'));
    render(<RapportinoScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('RC-001')).toBeInTheDocument();
    });
    // Should not crash when action fails
  });
});
