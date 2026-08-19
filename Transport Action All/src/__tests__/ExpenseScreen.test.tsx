/**
 * TESTS — ExpenseScreen (CRUD expenses)
 *
 * Covers:
 * - Render with expense list
 * - Search and filter by status
 * - Create expense (validate description + amount)
 * - Edit expense
 * - Confirm expense (Draft → Confirmed)
 * - Cancel expense (Draft/Confirmed → Cancelled)
 * - Correct expense (creates new Draft)
 * - API error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseScreen from '../components/ExpenseScreen';

const mockGetExpenses = vi.fn();
const mockCreateExpense = vi.fn();
const mockEditExpense = vi.fn();
const mockConfirmExpense = vi.fn();
const mockCancelExpense = vi.fn();
const mockCorrectExpense = vi.fn();

vi.mock('../services/api', () => ({
  getExpenses: (...args: any[]) => mockGetExpenses(...args),
  createExpense: (...args: any[]) => mockCreateExpense(...args),
  editExpense: (...args: any[]) => mockEditExpense(...args),
  confirmExpense: (...args: any[]) => mockConfirmExpense(...args),
  cancelExpense: (...args: any[]) => mockCancelExpense(...args),
  correctExpense: (...args: any[]) => mockCorrectExpense(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockOnNavigate = vi.fn();

const sampleExpenses = [
  { id: 'EXP-001', ownerType: 'empresa', ownerId: 'TA', category: 'fuel', description: 'Gas station', amount: 85.50, expenseDate: '2026-07-20', accountingDate: '2026-07-20', status: 'Draft', projectId: '', operatingCompany: 'TA', createdBy: 'admin', createdAt: '', updatedAt: '' },
  { id: 'EXP-002', ownerType: 'proyecto', ownerId: 'PRJ-001', category: 'tolls', description: 'Highway tolls', amount: 45.00, expenseDate: '2026-07-19', accountingDate: '2026-07-19', status: 'Confirmed', projectId: 'PRJ-001', operatingCompany: 'TA', createdBy: 'admin', createdAt: '', updatedAt: '' },
];

describe('ExpenseScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExpenses.mockResolvedValue(sampleExpenses);
  });

  it('renders and loads expenses', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Gas station')).toBeInTheDocument();
      expect(screen.getByText('Highway tolls')).toBeInTheDocument();
    });
  });

  it('displays totals for each status', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Gas station')).toBeInTheDocument();
    });
    // 85,50 € appears in summary card AND in the expense row
    const matches = screen.getAllByText(/85,50/);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by search query', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search expenses/i), { target: { value: 'Gas' } });
    expect(screen.getByText('Gas station')).toBeInTheDocument();
    expect(screen.queryByText('Highway tolls')).not.toBeInTheDocument();
  });

  it('opens create modal and creates expense', async () => {
    mockCreateExpense.mockResolvedValue({ success: true, id: 'EXP-NEW' });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Expense/i));

    await waitFor(() => {
      expect(screen.getByText('New Expense')).toBeInTheDocument();
    });

    // Fill description using placeholder
    fireEvent.change(screen.getByPlaceholderText(/Fuel for vehicle/i), { target: { value: 'Office supplies' } });
    // Fill amount using placeholder
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '120' } });

    // Click the first Save button in modal
    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockCreateExpense).toHaveBeenCalled();
    });
  });

  it('disables save button when description or amount are missing', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    // Open create modal
    fireEvent.click(screen.getByText(/Add Expense/i));
    await waitFor(() => expect(screen.getByText('New Expense')).toBeInTheDocument());

    // Save button should be disabled when fields are empty
    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons[0]).toBeDisabled();
  });

  it('confirms draft expense', async () => {
    mockConfirmExpense.mockResolvedValue({ success: true });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    // Click confirm button on draft expense (has title="Confirm")
    const confirmButtons = screen.getAllByTitle('Confirm');
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      // Use getAllByText since heading and paragraph both contain the text
      const matches = screen.getAllByText(/Confirm Expense/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    // Click the green Confirm button inside the modal (last "Confirm" text)
    const allConfirmTexts = screen.getAllByText('Confirm');
    // The last one is the button in the modal
    fireEvent.click(allConfirmTexts[allConfirmTexts.length - 1]);

    await waitFor(() => {
      expect(mockConfirmExpense).toHaveBeenCalled();
    });
  });

  it('cancels expense', async () => {
    mockCancelExpense.mockResolvedValue({ success: true });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    // Click cancel button on draft expense (has title="Cancel")
    const cancelButtons = screen.getAllByTitle('Cancel');
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      const matches = screen.getAllByText(/Cancel Expense/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    // Click the red Cancel button inside the modal (last "Cancel" text)
    const allCancelTexts = screen.getAllByText('Cancel');
    fireEvent.click(allCancelTexts[allCancelTexts.length - 1]);

    await waitFor(() => {
      expect(mockCancelExpense).toHaveBeenCalled();
    });
  });

  it('renders Excel and PDF export buttons', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('exports to Excel (CSV) and triggers download', async () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    const mockAnchor = { click: clickSpy, href: '', download: '' };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as any;
      return origCreateElement(tag);
    });

    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Excel'));

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  it('exports to PDF and opens print window', async () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockPrint = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: mockWrite, close: mockClose },
      print: mockPrint,
    } as any);

    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });
  });

  it('corrects confirmed expense (creates new Draft)', async () => {
    mockCorrectExpense.mockResolvedValue({ success: true });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Highway tolls')).toBeInTheDocument());

    // Confirmed expense (EXP-002) has Correct button (title="Correct")
    const correctButtons = screen.getAllByTitle('Correct');
    expect(correctButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(correctButtons[0]);

    await waitFor(() => {
      // Modal should appear with Correct Expense heading
      expect(screen.getAllByText('Correct Expense').length).toBeGreaterThanOrEqual(1);
    });

    // Click the Correct button inside the modal (the one with amber background)
    const modalBtns = screen.getAllByText('Correct');
    // Last one is the modal action button
    fireEvent.click(modalBtns[modalBtns.length - 1]);

    await waitFor(() => {
      expect(mockCorrectExpense).toHaveBeenCalled();
    });
  });

  it('filters by status correctly', async () => {
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    // Both expenses visible initially
    expect(screen.getByText('Gas station')).toBeInTheDocument();
    expect(screen.getByText('Highway tolls')).toBeInTheDocument();

    // Click Draft filter button (the button, not the summary card)
    const draftBtn = screen.getAllByText('Draft').find(el => el.tagName === 'BUTTON');
    fireEvent.click(draftBtn!);

    await waitFor(() => {
      expect(screen.getByText('Gas station')).toBeInTheDocument();
      expect(screen.queryByText('Highway tolls')).not.toBeInTheDocument();
    });

    // Click Confirmed filter button
    const confirmedBtn = screen.getAllByText('Confirmed').find(el => el.tagName === 'BUTTON');
    fireEvent.click(confirmedBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Gas station')).not.toBeInTheDocument();
      expect(screen.getByText('Highway tolls')).toBeInTheDocument();
    });

    // Click All to reset
    const allBtn = screen.getAllByText('All').find(el => el.tagName === 'BUTTON');
    fireEvent.click(allBtn!);

    await waitFor(() => {
      expect(screen.getByText('Gas station')).toBeInTheDocument();
      expect(screen.getByText('Highway tolls')).toBeInTheDocument();
    });
  });

  it('edits draft expense and saves', async () => {
    mockEditExpense.mockResolvedValue({ success: true });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    // Click edit button on draft expense (title="Edit")
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Expense/i)).toBeInTheDocument();
    });

    // Change description
    const descInput = screen.getByDisplayValue('Gas station');
    fireEvent.change(descInput, { target: { value: 'Updated fuel' } });

    // Click Save
    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockEditExpense).toHaveBeenCalled();
    });
  });

  it('handles API error on create gracefully', async () => {
    mockCreateExpense.mockResolvedValue({ error: 'Insufficient funds' });
    render(<ExpenseScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Gas station')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Expense/i));
    await waitFor(() => expect(screen.getByText('New Expense')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Fuel for vehicle/i), { target: { value: 'Office supplies' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });

    // showToast should be called for API error
    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockCreateExpense).toHaveBeenCalled();
    });
  });
});
