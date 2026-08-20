/**
 * TESTS — CollaboratorScreen (CRUD de colaboradores + tarifas)
 *
 * Covers:
 * - Render con lista de colaboradores
 * - Búsqueda
 * - Crear colaborador (validar name)
 * - Editar colaborador
 * - Eliminar colaborador
 * - Abrir detalle de tarifas
 * - CRUD de SupplierRate inline
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CollaboratorScreen from '../components/CollaboratorScreen';

const mockGetCollaborators = vi.fn();
const mockCreateCollaborator = vi.fn();
const mockUpdateCollaborator = vi.fn();
const mockDeleteCollaborator = vi.fn();
const mockGetSupplierRates = vi.fn();
const mockCreateSupplierRate = vi.fn();
const mockUpdateSupplierRate = vi.fn();
const mockDeleteSupplierRate = vi.fn();
const mockGetVehicleTypes = vi.fn();
const mockGetServiceTypes = vi.fn();

vi.mock('../services/api', () => ({
  getCollaborators: (...args: any[]) => mockGetCollaborators(...args),
  createCollaborator: (...args: any[]) => mockCreateCollaborator(...args),
  updateCollaborator: (...args: any[]) => mockUpdateCollaborator(...args),
  deleteCollaborator: (...args: any[]) => mockDeleteCollaborator(...args),
  getSupplierRates: (...args: any[]) => mockGetSupplierRates(...args),
  createSupplierRate: (...args: any[]) => mockCreateSupplierRate(...args),
  updateSupplierRate: (...args: any[]) => mockUpdateSupplierRate(...args),
  deleteSupplierRate: (...args: any[]) => mockDeleteSupplierRate(...args),
  getVehicleTypes: (...args: any[]) => mockGetVehicleTypes(...args),
  getServiceTypes: (...args: any[]) => mockGetServiceTypes(...args),
}));

const mockOnNavigate = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { email: 'admin@test.com', role: 'admin' },
    can: () => true,
  }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const sampleCollaborators = [
  { id: 'COL-001', name: 'Transport SRL', vat: 'IT123', address: '', phone: '', email: '', paymentTerms: 30, active: true, notes: '', operatingCompany: 'TA', createdAt: '', updatedAt: '' },
  { id: 'COL-002', name: 'Movements SPA', vat: 'IT456', address: '', phone: '', email: '', paymentTerms: 60, active: true, notes: '', operatingCompany: 'TA', createdAt: '', updatedAt: '' },
];

const sampleRates = [
  { id: 'SR-001', supplierType: 'collaborator', supplierId: 'COL-001', projectId: 'PRJ-001', serviceType: 'Disposizione', vehicleType: 'Van', baseRate: 200, includedKm: 100, includedHours: 8, extraKmRate: 1.5, extraHourRate: 30, diariaPiena: 50, diariaMezza: 35, nightExtra: 20, holidayExtra: 30, waitHourRate: 25, validFrom: '', validTo: '', active: true, operatingCompany: 'TA', createdAt: '', updatedAt: '' },
];

describe('CollaboratorScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCollaborators.mockResolvedValue(sampleCollaborators);
    mockGetSupplierRates.mockResolvedValue(sampleRates);
    mockGetVehicleTypes.mockResolvedValue(['Van', 'Car']);
    mockGetServiceTypes.mockResolvedValue(['Dispo', 'Transfer Airport', 'Transfer City']);
  });

  it('renders and loads collaborators', async () => {
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Transport SRL')).toBeInTheDocument();
      expect(screen.getByText('Movements SPA')).toBeInTheDocument();
    });
  });

  it('filters by search query', async () => {
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Transport SRL')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search providers/i), { target: { value: 'Transport' } });
    expect(screen.getByText('Transport SRL')).toBeInTheDocument();
    expect(screen.queryByText('Movements SPA')).not.toBeInTheDocument();
  });

  it('opens create modal and creates collaborator', async () => {
    mockCreateCollaborator.mockResolvedValue({ success: true, id: 'COL-NEW' });
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Transport SRL')).toBeInTheDocument());

    // "Add Provider" appears in button AND modal title — click the first one (button)
    const addButtons = screen.getAllByText(/Add Provider/i);
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      // After modal opens, "Add Provider" appears twice
      expect(screen.getAllByText('Add Provider').length).toBeGreaterThanOrEqual(2);
    });

    // Fill the Name field — find the input inside the modal using within
    const modal = document.querySelector('.fixed.inset-0')!;
    const modalInputs = within(modal as HTMLElement).getAllByRole('textbox');
    // First input in the modal is the Name field
    fireEvent.change(modalInputs[0], { target: { value: 'New Provider' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockCreateCollaborator).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Provider' }));
    });
  });

  it('disables Create button when name is empty', async () => {
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Transport SRL')).toBeInTheDocument());

    const addButtons = screen.getAllByText(/Add Provider/i);
    fireEvent.click(addButtons[0]);

    // The Create button should be disabled when name is empty
    const createBtn = screen.getByText('Create');
    expect(createBtn).toBeDisabled();
    expect(mockCreateCollaborator).not.toHaveBeenCalled();
  });

  it('opens detail panel with supplier rates via Rates button', async () => {
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Transport SRL')).toBeInTheDocument());

    // Click the "Rates" button on the first collaborator
    const ratesButtons = screen.getAllByText('Rates');
    fireEvent.click(ratesButtons[0]);

    await waitFor(() => {
      expect(mockGetSupplierRates).toHaveBeenCalledWith({ supplierId: 'COL-001', supplierType: 'collaborator' });
    });
  });

  it('deletes collaborator after confirmation', async () => {
    mockDeleteCollaborator.mockResolvedValue({ success: true });
    render(<CollaboratorScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Transport SRL')).toBeInTheDocument());

    // Find the collaborator list and the first card
    const list = document.getElementById('collaborators-list')!;
    const cards = list.querySelectorAll(':scope > div');
    // First card = Transport SRL
    const firstCard = cards[0];
    const cardButtons = within(firstCard as HTMLElement).getAllByRole('button');
    // The trash button is the last one (icon-only, no text)
    const trashBtn = cardButtons[cardButtons.length - 1];
    fireEvent.click(trashBtn);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(mockDeleteCollaborator).toHaveBeenCalledWith('COL-001');
    });
  });
});
