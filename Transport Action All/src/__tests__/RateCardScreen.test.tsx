/**
 * TESTS — RateCardScreen (CRUD rate cards)
 *
 * Covers:
 * - Render with rate card list
 * - Search filter
 * - Create rate card (validates name)
 * - Edit rate card
 * - Disables save when name empty
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import RateCardScreen from '../components/RateCardScreen';

const mockGetRateCards = vi.fn();
const mockCreateRateCard = vi.fn();
const mockUpdateRateCard = vi.fn();
const mockGetClients = vi.fn();

vi.mock('../services/api', () => ({
  getRateCards: (...args: any[]) => mockGetRateCards(...args),
  createRateCard: (...args: any[]) => mockCreateRateCard(...args),
  updateRateCard: (...args: any[]) => mockUpdateRateCard(...args),
  getClients: (...args: any[]) => mockGetClients(...args),
}));

const mockOnNavigate = vi.fn();

const sampleClients = [
  { id: 'CLI-001', name: 'Hotel Excelsior' },
];

const sampleCards = [
  { id: 'RC-001', name: 'Airport Transfer', category: 'Airport', vehicleType: 'Van', basePrice: 80, extraKmRate: 1.5, extraHourRate: 25, waitRate: 15, nightFee: 20, holidayFee: 30, halfDayPrice: 250, fullDayPrice: 400, airportSurcharge: 0, clientId: 'CLI-001', notes: '' },
  { id: 'RC-002', name: 'City Tour', category: 'Tour', vehicleType: 'Minivan', basePrice: 150, extraKmRate: 0, extraHourRate: 0, waitRate: 0, nightFee: 0, holidayFee: 0, halfDayPrice: 0, fullDayPrice: 0, airportSurcharge: 0, clientId: '', notes: '' },
];

describe('RateCardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRateCards.mockResolvedValue(sampleCards);
    mockGetClients.mockResolvedValue(sampleClients);
  });

  it('renders and loads rate cards', async () => {
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Airport Transfer')).toBeInTheDocument();
      expect(screen.getByText('City Tour')).toBeInTheDocument();
    });
  });

  it('filters cards by search query', async () => {
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Airport Transfer')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search rate cards/i), { target: { value: 'Airport' } });
    expect(screen.getByText('Airport Transfer')).toBeInTheDocument();
    expect(screen.queryByText('City Tour')).not.toBeInTheDocument();
  });

  it('opens create modal and creates rate card', async () => {
    mockCreateRateCard.mockResolvedValue({ success: true, id: 'RC-NEW' });
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Airport Transfer')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Card/i));
    await waitFor(() => expect(screen.getByText('New Rate Card')).toBeInTheDocument());

    // Scope to the modal dialog
    const modal = screen.getByText('New Rate Card').closest('.bg-surface-container-lowest') as HTMLElement;
    const modalQueries = within(modal);

    // Fill name (first textbox inside modal)
    const nameInput = modalQueries.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'New Transfer Rate' } });
    // Fill base price (first spinbutton inside modal)
    const priceInput = modalQueries.getAllByRole('spinbutton')[0];
    fireEvent.change(priceInput, { target: { value: '100' } });

    // Click Save button inside the modal
    const saveBtn = modalQueries.getByText('Save');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateRateCard).toHaveBeenCalled();
    });
  });

  it('disables save button when name is empty', async () => {
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Airport Transfer')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Card/i));
    await waitFor(() => expect(screen.getByText('New Rate Card')).toBeInTheDocument());

    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons[0]).toBeDisabled();
  });

  it('opens edit modal for existing rate card', async () => {
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Airport Transfer')).toBeInTheDocument());

    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Rate Card/i)).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  it('shows rate card details with prices', async () => {
    render(<RateCardScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Base: 80,00 €')).toBeInTheDocument();
      expect(screen.getByText('HalfDay: 250,00 €')).toBeInTheDocument();
      expect(screen.getByText('FullDay: 400,00 €')).toBeInTheDocument();
      expect(screen.getByText('ExtraKm: 1,50 €')).toBeInTheDocument();
    });
  });
});
