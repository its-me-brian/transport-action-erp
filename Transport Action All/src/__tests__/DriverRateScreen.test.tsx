/**
 * TESTS — DriverRateScreen (CRUD driver rates)
 *
 * Covers:
 * - Render with rate list
 * - Search filter
 * - Create rate (validates driver selection)
 * - Edit rate
 * - Disables save when driver not selected
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverRateScreen from '../components/DriverRateScreen';

const mockGetDriverRates = vi.fn();
const mockCreateDriverRate = vi.fn();
const mockUpdateDriverRate = vi.fn();
const mockGetDrivers = vi.fn();

vi.mock('../services/api', () => ({
  getDriverRates: (...args: any[]) => mockGetDriverRates(...args),
  createDriverRate: (...args: any[]) => mockCreateDriverRate(...args),
  updateDriverRate: (...args: any[]) => mockUpdateDriverRate(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockOnNavigate = vi.fn();

const sampleDrivers = [
  { id: 'DRV-001', name: 'Marco Rossi' },
  { id: 'DRV-002', name: 'Luca Bianchi' },
];

const sampleRates = [
  { id: 'RATE-001', driverId: 'DRV-001', vehicleType: 'Transfer', transferRate: 50, halfDayRate: 200, fullDayRate: 350, nightExtra: 25, holidayExtra: 50, waitHourRate: 15 },
  { id: 'RATE-002', driverId: 'DRV-002', vehicleType: 'FullDay', transferRate: 0, halfDayRate: 0, fullDayRate: 400, nightExtra: 0, holidayExtra: 0, waitHourRate: 20 },
];

describe('DriverRateScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDriverRates.mockResolvedValue(sampleRates);
    mockGetDrivers.mockResolvedValue(sampleDrivers);
  });

  it('renders and loads driver rates', async () => {
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Marco Rossi')).toBeInTheDocument();
      expect(screen.getByText('Luca Bianchi')).toBeInTheDocument();
    });
  });

  it('filters rates by search query', async () => {
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Marco Rossi')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search rates/i), { target: { value: 'Marco' } });
    expect(screen.getByText('Marco Rossi')).toBeInTheDocument();
    expect(screen.queryByText('Luca Bianchi')).not.toBeInTheDocument();
  });

  it('opens create modal and creates rate', async () => {
    mockCreateDriverRate.mockResolvedValue({ success: true, id: 'RATE-NEW' });
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Marco Rossi')).toBeInTheDocument());

    // Click "Add Rate" button
    fireEvent.click(screen.getByText(/Add Rate/i));

    await waitFor(() => {
      expect(screen.getByText('New Driver Rate')).toBeInTheDocument();
    });

    // Select driver
    fireEvent.change(screen.getByDisplayValue('Select driver...'), { target: { value: 'DRV-001' } });
    // Fill transfer rate using placeholder
    const rateInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(rateInputs[0], { target: { value: '75' } });

    // Click Save
    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockCreateDriverRate).toHaveBeenCalled();
    });
  });

  it('disables save button when driver not selected', async () => {
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Marco Rossi')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Rate/i));
    await waitFor(() => expect(screen.getByText('New Driver Rate')).toBeInTheDocument());

    // Save button should be disabled when no driver selected
    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons[0]).toBeDisabled();
  });

  it('opens edit modal for existing rate', async () => {
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Marco Rossi')).toBeInTheDocument());

    // Click edit button on first rate
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Rate/i)).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  it('shows rate details with amounts', async () => {
    render(<DriverRateScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Transfer: 50,00 €')).toBeInTheDocument();
      expect(screen.getByText('HalfDay: 200,00 €')).toBeInTheDocument();
      expect(screen.getByText('FullDay: 350,00 €')).toBeInTheDocument();
    });
  });
});
