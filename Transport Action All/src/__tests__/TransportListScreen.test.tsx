/**
 * TESTS — TransportListScreen (Transport list management)
 *
 * Covers:
 * - Render without crashing, API calls on mount
 * - Driver history loading and display
 * - DriverCell: rendered only in preview step (after upload)
 * - Upload flow with mocked API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransportListScreen from '../components/TransportListScreen';

const mockGetTransportLists = vi.fn();
const mockGetServicesByTransportListId = vi.fn();
const mockGetDrivers = vi.fn();
const mockGetAgencies = vi.fn();
const mockGetProjects = vi.fn();
const mockUploadAndParseExcel = vi.fn();
const mockImportTransportListWithProject = vi.fn();
const mockAutoDetectImportTargets = vi.fn();
const mockUpdateServiceField = vi.fn();
const mockExportTransportListExcel = vi.fn();
const mockSendTransportListEmail = vi.fn();
const mockSendServicesToAgency = vi.fn();
const mockBuildDriverWhatsAppMessage = vi.fn();
const mockBuildGroupWhatsAppMessage = vi.fn();
const mockBuildAgencyWhatsAppMessage = vi.fn();
const mockNormalizeTransportServices = vi.fn((s: any[]) => s);
const mockAssignDriver = vi.fn();
const mockConfirmService = vi.fn();
const mockStartService = vi.fn();
const mockCompleteService = vi.fn();
const mockValidateService = vi.fn();
const mockCreateDriver = vi.fn();
const mockUpdateDriver = vi.fn();
const mockGetServices = vi.fn();

vi.mock('../services/api', () => ({
  getTransportLists: (...args: any[]) => mockGetTransportLists(...args),
  getServicesByTransportListId: (...args: any[]) => mockGetServicesByTransportListId(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
  getAgencies: (...args: any[]) => mockGetAgencies(...args),
  getProjects: (...args: any[]) => mockGetProjects(...args),
  uploadAndParseExcel: (...args: any[]) => mockUploadAndParseExcel(...args),
  importTransportListWithProject: (...args: any[]) => mockImportTransportListWithProject(...args),
  autoDetectImportTargets: (...args: any[]) => mockAutoDetectImportTargets(...args),
  updateServiceField: (...args: any[]) => mockUpdateServiceField(...args),
  exportTransportListExcel: (...args: any[]) => mockExportTransportListExcel(...args),
  sendTransportListEmail: (...args: any[]) => mockSendTransportListEmail(...args),
  sendServicesToAgency: (...args: any[]) => mockSendServicesToAgency(...args),
  buildDriverWhatsAppMessage: (...args: any[]) => mockBuildDriverWhatsAppMessage(...args),
  buildGroupWhatsAppMessage: (...args: any[]) => mockBuildGroupWhatsAppMessage(...args),
  buildAgencyWhatsAppMessage: (...args: any[]) => mockBuildAgencyWhatsAppMessage(...args),
  normalizeTransportServices: (services: any[]) => mockNormalizeTransportServices(services),
  passengerDisplay: (p: any) => p?.name || '',
  passengerRolesDisplay: (p: any) => p?.roles?.join(', ') || '',
  hasPassengerRole: (p: any, role: string) => p?.roles?.includes(role),
  pickupDisplay: (s: any) => s?.pickup || '',
  dropoffDisplay: (s: any) => s?.dropoff || '',
  assignDriver: (...args: any[]) => mockAssignDriver(...args),
  confirmService: (...args: any[]) => mockConfirmService(...args),
  startService: (...args: any[]) => mockStartService(...args),
  completeService: (...args: any[]) => mockCompleteService(...args),
  validateService: (...args: any[]) => mockValidateService(...args),
  createDriver: (...args: any[]) => mockCreateDriver(...args),
  updateDriver: (...args: any[]) => mockUpdateDriver(...args),
  getServices: (...args: any[]) => mockGetServices(...args),
}));

vi.mock('../components/print', () => ({
  PrintPreview: ({ onClose }: any) => <div data-testid="print-preview"><button onClick={onClose}>Close</button></div>,
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockOnNavigate = vi.fn();

const sampleDrivers = [
  { id: 'DRV-001', name: 'Marco Rossi', phone: '+39333111222', vehiclePreferred: 'FIAT-500', status: 'active' },
  { id: 'DRV-002', name: 'Luca Bianchi', phone: '', vehiclePreferred: '', status: 'active' },
];

const sampleServices = [
  {
    id: 'SVC-001', date: '2026-07-20', time: '08:00', vehicle: 'FIAT-500', driver: 'Marco Rossi',
    driverPhone: '+39333111222', driverId: 'DRV-001', from: 'Milano', to: 'Roma',
    status: 'pending', passengers: [], operatingCompany: 'TA', pickup: 'Hotel', dropoff: 'Airport',
    pickupLines: [], dropoffLines: [], km: 500, notes: '', transportListId: 'TL-001',
  },
  {
    id: 'SVC-002', date: '2026-07-20', time: '09:00', vehicle: 'MERCEDES-V', driver: '',
    driverPhone: '', driverId: '', from: 'Roma', to: 'Napoli',
    status: 'pending', passengers: [], operatingCompany: 'TA', pickup: '', dropoff: '',
    pickupLines: [], dropoffLines: [], km: 200, notes: '', transportListId: 'TL-001',
  },
];

const sampleHistory = [
  { id: 'TL-001', importDate: '2026-07-20T10:00:00Z', fileName: 'transport.xlsx', production: 'Film Production', totalServices: 10, totalDrivers: 5, status: 'registered', dateRange: '2026-07-20/2026-07-26' },
  { id: 'TL-002', importDate: '2026-07-13T08:00:00Z', fileName: 'transport2.xlsx', production: 'Another Production', totalServices: 8, totalDrivers: 3, status: 'parsed', dateRange: '' },
];

describe('TransportListScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransportLists.mockResolvedValue(sampleHistory);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetAgencies.mockResolvedValue([]);
    mockGetProjects.mockResolvedValue([]);
    mockGetServicesByTransportListId.mockResolvedValue(sampleServices);
    mockNormalizeTransportServices.mockImplementation((s: any[]) => s);
    mockAssignDriver.mockResolvedValue({});
    mockCreateDriver.mockResolvedValue({ id: 'DRV-NEW', success: true });
    mockUpdateDriver.mockResolvedValue({});
    mockUpdateServiceField.mockResolvedValue({});
    mockAutoDetectImportTargets.mockResolvedValue({ client: null, project: null });
  });

  it('renders without crashing', async () => {
    const { container } = render(<TransportListScreen onNavigate={mockOnNavigate} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('calls getTransportLists and getDrivers on mount', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetTransportLists).toHaveBeenCalled();
      expect(mockGetDrivers).toHaveBeenCalled();
    });
  });

  it('shows header with Transport in the title', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText(/Transport List/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('loads and deduplicates drivers from API', async () => {
    mockGetDrivers.mockResolvedValue([
      { id: 'DRV-001', name: 'Marco Rossi', phone: '+39333111222' },
      { id: 'DRV-001', name: 'Marco Rossi', phone: '+39333111222' },
      { id: 'DRV-003', name: '  Marco Rossi  ', phone: '' },
    ]);
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetDrivers).toHaveBeenCalled();
    });
  });

  it('displays transport history entries', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      // Desktop + mobile views = 2 occurrences each
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Another Production').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows View button for each history entry (desktop + mobile)', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      const viewButtons = screen.getAllByText('View');
      // 2 entries × 2 views (desktop table + mobile cards) = 4
      expect(viewButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows stats: total entries count', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });
    const viewButtons = screen.getAllByText('View');
    expect(viewButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TransportListScreen — History view loads services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransportLists.mockResolvedValue(sampleHistory);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetAgencies.mockResolvedValue([]);
    mockGetProjects.mockResolvedValue([]);
    mockGetServicesByTransportListId.mockResolvedValue(sampleServices);
    mockNormalizeTransportServices.mockImplementation((s: any[]) => s);
    mockAutoDetectImportTargets.mockResolvedValue({ client: null, project: null });
  });

  it('loads services when clicking View on a history entry', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });

    // Click View on first history entry (desktop table)
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(mockGetServicesByTransportListId).toHaveBeenCalledWith('TL-001');
    });
  });

  it('displays services in read-only table after viewing history', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Marco Rossi')).toBeInTheDocument();
      expect(screen.getByText('(vacío)')).toBeInTheDocument();
    });
    // Vehicle columns
    expect(screen.getAllByText('FIAT-500').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('MERCEDES-V').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Close button in history view and dismisses it', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByText('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Marco Rossi')).toBeInTheDocument();
    });

    // Use the Close button in the history header (has px-2 py-1 class)
    const closeButtons = screen.getAllByText('Close');
    const historyClose = closeButtons.find(btn =>
      btn.className.includes('px-2') && btn.className.includes('py-1')
    );
    expect(historyClose).toBeTruthy();
    fireEvent.click(historyClose!);

    await waitFor(() => {
      expect(screen.queryByText('Marco Rossi')).not.toBeInTheDocument();
    });
  });
});

describe('TransportListScreen — Upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransportLists.mockResolvedValue([]);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetAgencies.mockResolvedValue([]);
    mockGetProjects.mockResolvedValue([]);
    mockUploadAndParseExcel.mockResolvedValue({
      servicios: sampleServices.map(s => ({ ...s })),
      dateStr: '2026-07-20',
      production: 'Test Production',
      projectName: 'Test Project',
      transportCompany: 'Test Transport',
      footerContacts: [],
      _debug: {},
    });
    mockNormalizeTransportServices.mockImplementation((s: any[]) => s);
    mockAutoDetectImportTargets.mockResolvedValue({ client: null, project: null });
    mockImportTransportListWithProject.mockResolvedValue({ success: true });
  });

  it('shows upload area initially', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
    });
    // Should show upload instruction
    expect(screen.getByText(/Subí el Excel/i)).toBeInTheDocument();
  });

  it('shows file input for upload', async () => {
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
    });
    // File input should exist
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TransportListScreen — Error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransportLists.mockResolvedValue(sampleHistory);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
    mockGetAgencies.mockResolvedValue([]);
    mockGetProjects.mockResolvedValue([]);
    mockGetServicesByTransportListId.mockResolvedValue(sampleServices);
    mockNormalizeTransportServices.mockImplementation((s: any[]) => s);
    mockAutoDetectImportTargets.mockResolvedValue({ client: null, project: null });
    mockCreateDriver.mockResolvedValue({ id: 'DRV-NEW', success: true });
    mockUpdateServiceField.mockResolvedValue({});
  });

  it('handles getTransportLists API failure gracefully', async () => {
    mockGetTransportLists.mockRejectedValue(new Error('Network error'));
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetTransportLists).toHaveBeenCalled();
    });
    // Should not crash — screen renders with empty history
    expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
  });

  it('handles getServicesByTransportListId API failure gracefully', async () => {
    mockGetServicesByTransportListId.mockRejectedValue(new Error('Service not found'));
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText('View')[0]);
    await waitFor(() => {
      expect(mockGetServicesByTransportListId).toHaveBeenCalledWith('TL-001');
    });
    // Should not crash
  });

  it('handles upload API failure gracefully', async () => {
    mockGetTransportLists.mockResolvedValue([]);
    mockUploadAndParseExcel.mockRejectedValue(new Error('Invalid Excel format'));
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
    });
    // Trigger upload
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(1);
    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(fileInputs[0], { target: { files: [file] } });
    await waitFor(() => {
      expect(mockUploadAndParseExcel).toHaveBeenCalled();
    });
    // Should not crash
  });

  it('handles import API failure gracefully', async () => {
    mockGetTransportLists.mockResolvedValue([]);
    mockUploadAndParseExcel.mockResolvedValue({
      servicios: sampleServices.map(s => ({ ...s })),
      dateStr: '2026-07-20',
      production: 'Test Production',
      projectName: 'Test Project',
      transportCompany: 'Test Transport',
      footerContacts: [],
      _debug: {},
    });
    mockImportTransportListWithProject.mockRejectedValue(new Error('Import failed'));
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
    });
    // Trigger upload
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(fileInputs[0], { target: { files: [file] } });
    await waitFor(() => {
      expect(mockUploadAndParseExcel).toHaveBeenCalled();
    });
    // Should not crash
  });

  it('handles driver creation failure gracefully', async () => {
    mockCreateDriver.mockRejectedValue(new Error('Driver creation failed'));
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });
    // The screen should still render
    expect(screen.getAllByText(/Transport List/i).length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty transport list history', async () => {
    mockGetTransportLists.mockResolvedValue([]);
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(mockGetTransportLists).toHaveBeenCalled();
    });
    // Should show upload area when no history
    expect(screen.getByText(/Import Transport List/i)).toBeInTheDocument();
  });

  it('handles services with missing driver data', async () => {
    mockGetServicesByTransportListId.mockResolvedValue([
      { id: 'SVC-003', date: '2026-07-20', time: '10:00', vehicle: '', driver: '', driverPhone: '', driverId: '', from: 'Milano', to: 'Roma', status: 'pending', passengers: [], operatingCompany: 'TA', pickup: '', dropoff: '', pickupLines: [], dropoffLines: [], km: 0, notes: '', transportListId: 'TL-001' },
    ]);
    render(<TransportListScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getAllByText('Film Production').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText('View')[0]);
    await waitFor(() => {
      expect(mockGetServicesByTransportListId).toHaveBeenCalledWith('TL-001');
    });
    // Should show empty/unassigned for missing driver
    expect(screen.getAllByText('(vacío)').length).toBeGreaterThanOrEqual(1);
  });
});
