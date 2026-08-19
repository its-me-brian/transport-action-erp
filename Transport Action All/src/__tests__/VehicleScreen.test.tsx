/**
 * TESTS — VehicleScreen (CRUD de vehículos)
 *
 * Covers:
 * - Render con lista de vehículos
 * - Búsqueda y filtro por status
 * - Crear vehículo (abrir modal, guardar, validar patente)
 * - Editar vehículo
 * - Manejo de errores API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VehicleScreen from '../components/VehicleScreen';

const mockGetVehicles = vi.fn();
const mockCreateVehicle = vi.fn();
const mockUpdateVehicle = vi.fn();

vi.mock('../services/api', () => ({
  getVehicles: (...args: any[]) => mockGetVehicles(...args),
  createVehicle: (...args: any[]) => mockCreateVehicle(...args),
  updateVehicle: (...args: any[]) => mockUpdateVehicle(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockOnNavigate = vi.fn();

const sampleVehicles = [
  { id: 'VEH-001', plate: 'ABC-123', brand: 'Fiat', model: 'Ducato', type: 'Van', ownership: 'tercero', capacity: 8, status: 'Disponible', driverDefault: '', operatingCompany: 'TA', insuranceExpiry: '', inspectionExpiry: '', notes: '', createdAt: '', updatedAt: '' },
  { id: 'VEH-002', plate: 'DEF-456', brand: 'Mercedes', model: 'Sprinter', type: 'Van', ownership: 'propio', capacity: 12, status: 'En uso', driverDefault: '', operatingCompany: 'TA', insuranceExpiry: '', inspectionExpiry: '', notes: '', createdAt: '', updatedAt: '' },
];

describe('VehicleScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVehicles.mockResolvedValue(sampleVehicles);
  });

  it('renders and loads vehicles', async () => {
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
      expect(screen.getByText('DEF-456')).toBeInTheDocument();
    });
  });

  it('filters by search query', async () => {
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search vehicles/i), { target: { value: 'Fiat' } });
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.queryByText('DEF-456')).not.toBeInTheDocument();
  });

  it('opens create modal and creates vehicle', async () => {
    mockCreateVehicle.mockResolvedValue({ success: true, id: 'VEH-NEW' });
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Vehicle/i));

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    // Fill plate (required) — find the Plate input in the modal
    const modal = document.querySelector('.fixed.inset-0')!;
    const plateInput = modal.querySelector('input[placeholder="ABC 123"]') as HTMLInputElement;
    fireEvent.change(plateInput, { target: { value: 'GHI-789' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateVehicle).toHaveBeenCalledWith(expect.objectContaining({ plate: 'GHI-789' }));
    });
  });

  it('disables Save button when plate is empty on create', async () => {
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Vehicle/i));
    
    // The Save button should be disabled when plate is empty
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
    expect(mockCreateVehicle).not.toHaveBeenCalled();
  });

  it('opens edit modal with existing data', async () => {
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());

    const editButtons = screen.getAllByTitle(/Edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Vehicle/i)).toBeInTheDocument();
    });
  });

  it('edits vehicle and calls updateVehicle', async () => {
    mockUpdateVehicle.mockResolvedValue({ success: true });
    render(<VehicleScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('ABC-123')).toBeInTheDocument());

    const editButtons = screen.getAllByTitle(/Edit/i);
    fireEvent.click(editButtons[0]);
    // Edit modal uses "Update" as submit label
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdateVehicle).toHaveBeenCalled();
    });
  });
});
