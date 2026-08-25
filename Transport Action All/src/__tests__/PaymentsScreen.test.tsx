/**
 * TESTS — PaymentsScreen (CRUD payments)
 *
 * Covers:
 * - Render with payment list and loading state
 * - Search and filter payments
 * - Status filter
 * - Date filters (DateFrom, DateTo)
 * - Clear filters
 * - Export to Excel (CSV)
 * - Export to PDF (print)
 * - Create payment (validate invoice ID + amount)
 * - Cash tracking fields (CashReceivedBy, CashDate, CashReference)
 * - Confirm payment (Registrado → Confirmado)
 * - Reconcile payment (Confirmado → Conciliado)
 * - API error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PaymentsScreen from '../components/PaymentsScreen';

const mockGetPayments = vi.fn();
const mockRegisterPayment = vi.fn();
const mockConfirmPayment = vi.fn();
const mockReconcilePayment = vi.fn();
const mockEditPayment = vi.fn();

vi.mock('../services/api', () => ({
  getPayments: (...args: any[]) => mockGetPayments(...args),
  registerPayment: (...args: any[]) => mockRegisterPayment(...args),
  confirmPayment: (...args: any[]) => mockConfirmPayment(...args),
  reconcilePayment: (...args: any[]) => mockReconcilePayment(...args),
  editPayment: (...args: any[]) => mockEditPayment(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockOnNavigate = vi.fn();

const samplePayments = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-TA-2026-00045',
    clientId: 'CL-001',
    amount: 1500.00,
    paymentMethod: 'transfer',
    paymentDate: '2026-07-20',
    reference: 'REF-001',
    notes: 'First payment',
    status: 'Registrado',
    createdBy: 'admin',
    createdAt: '',
    confirmedAt: '',
    reconciledAt: '',
  },
  {
    id: 'PAY-002',
    invoiceId: 'INV-TA-2026-00046',
    clientId: 'CL-002',
    amount: 2300.50,
    paymentMethod: 'cash',
    paymentDate: '2026-07-21',
    reference: 'REF-002',
    notes: 'Cash payment',
    status: 'Confirmado',
    createdBy: 'admin',
    createdAt: '',
    confirmedAt: '',
    reconciledAt: '',
  },
  {
    id: 'PAY-003',
    invoiceId: 'INV-TA-2026-00047',
    clientId: 'CL-001',
    amount: 800.00,
    paymentMethod: 'card',
    paymentDate: '2026-07-22',
    reference: '',
    notes: '',
    status: 'Conciliado',
    createdBy: 'admin',
    createdAt: '',
    confirmedAt: '',
    reconciledAt: '',
  },
];

describe('PaymentsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPayments.mockResolvedValue(samplePayments);
  });

  it('renders and loads payments', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
      expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument();
      expect(screen.getByText('Invoice: INV-TA-2026-00047')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    mockGetPayments.mockReturnValue(new Promise(() => {}));
    const { container } = render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('shows empty state when no payments exist', async () => {
    mockGetPayments.mockResolvedValue({ payments: [] });
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('No payments recorded yet')).toBeInTheDocument();
    });
  });

  it('shows empty search state', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search payments/i), { target: { value: 'ZZZZZ' } });
    expect(screen.getByText('No payments match your search')).toBeInTheDocument();
  });

  it('filters payments by search query', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search payments/i), { target: { value: 'INV-TA-2026-00046' } });
    expect(screen.queryByText('Invoice: INV-TA-2026-00045')).not.toBeInTheDocument();
    expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument();
  });

  it('displays payment count and total in header', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText(/3 payments/)).toBeInTheDocument();
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Registered')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Reconciled')).toBeInTheDocument();
    });
  });

  it('displays payment methods correctly', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });
  });

  it('opens add modal and creates payment', async () => {
    mockRegisterPayment.mockResolvedValue({ success: true, id: 'PAY-NEW' });
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    // Open modal - click the header button (has Plus icon + "Record Payment" in span)
    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);

    // Wait for modal to appear - look for modal heading "Record Payment"
    await waitFor(() => {
      const modalHeadings = screen.getAllByText('Record Payment');
      expect(modalHeadings.length).toBe(2); // header button + modal title
    });

    // Find the modal overlay
    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modal = within(modalOverlay as HTMLElement);

    // Fill invoice ID
    fireEvent.change(modal.getByPlaceholderText(/INV-TA/i), { target: { value: 'INV-TA-2026-00099' } });

    // Fill amount
    fireEvent.change(modal.getByPlaceholderText('0.00'), { target: { value: '500' } });

    // Click Save
    fireEvent.click(modal.getByText('Save'));

    await waitFor(() => {
      expect(mockRegisterPayment).toHaveBeenCalled();
    });
  });

  it('disables save button when invoice ID or amount are missing', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Record Payment').length).toBe(2);
    });

    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modal = within(modalOverlay as HTMLElement);
    const saveButtons = modal.getAllByText('Save');
    expect(saveButtons[saveButtons.length - 1]).toBeDisabled();
  });

  it('shows cash tracking fields when method is cash', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Record Payment').length).toBe(2);
    });

    // Select cash method
    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modal = within(modalOverlay as HTMLElement);
    const select = modal.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cash' } });

    // Cash fields should appear
    await waitFor(() => {
      expect(screen.getByText('Received By')).toBeInTheDocument();
      expect(screen.getByText('Cash Date')).toBeInTheDocument();
      expect(screen.getByText('Cash Reference')).toBeInTheDocument();
    });
  });

  it('hides cash tracking fields when method is not cash', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Record Payment').length).toBe(2);
    });

    // Default is transfer, cash fields should NOT be present
    expect(screen.queryByText('Received By')).not.toBeInTheDocument();
    expect(screen.queryByText('Cash Date')).not.toBeInTheDocument();
    expect(screen.queryByText('Cash Reference')).not.toBeInTheDocument();
  });

  it('confirms a registered payment', async () => {
    mockConfirmPayment.mockResolvedValue({ success: true });
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    // Click the Confirm button on the Registrado payment (first one)
    const confirmButtons = screen.getAllByText('Confirm');
    fireEvent.click(confirmButtons[0]);

    // After clicking, the inline confirm should show a "No" button
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    // Now click the Confirm action button (the one in the inline confirm div)
    // The "No" button is next to it, so find Confirm buttons again
    const actionConfirmButtons = screen.getAllByText('Confirm');
    // There should be exactly 1 "Confirm" button (the action one) + "No"
    fireEvent.click(actionConfirmButtons[0]);

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith('PAY-001');
    });
  });

  it('cancels inline confirm action', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    // Click Confirm button on the Registrado payment
    const confirmButtons = screen.getAllByText('Confirm');
    fireEvent.click(confirmButtons[0]);

    // Click "No" to cancel
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('No'));

    // The "No" button should be gone
    expect(screen.queryByText('No')).not.toBeInTheDocument();
  });

  it('reconciles a confirmed payment', async () => {
    mockReconcilePayment.mockResolvedValue({ success: true });
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument());

    // Click Reconcile button on the Confirmado payment
    const reconcileButtons = screen.getAllByText('Reconcile');
    fireEvent.click(reconcileButtons[0]);

    // After clicking, inline confirm should show "No" button
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    // Click the Reconcile action button
    const actionReconcileButtons = screen.getAllByText('Reconcile');
    fireEvent.click(actionReconcileButtons[0]);

    await waitFor(() => {
      expect(mockReconcilePayment).toHaveBeenCalledWith('PAY-002');
    });
  });

  it('cancels inline reconcile action', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument());

    // Click Reconcile button on the Confirmado payment
    const reconcileButtons = screen.getAllByText('Reconcile');
    fireEvent.click(reconcileButtons[0]);

    // Click "No" to cancel
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('No'));

    // "No" should be gone
    expect(screen.queryByText('No')).not.toBeInTheDocument();
  });

  it('handles getPayments API error gracefully', async () => {
    mockGetPayments.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles registerPayment API error', async () => {
    mockRegisterPayment.mockRejectedValue(new Error('Save failed'));
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Record Payment').length).toBe(2);
    });

    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modal = within(modalOverlay as HTMLElement);
    fireEvent.change(modal.getByPlaceholderText(/INV-TA/i), { target: { value: 'INV-TEST' } });
    fireEvent.change(modal.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(modal.getByText('Save'));

    await waitFor(() => {
      expect(mockRegisterPayment).toHaveBeenCalled();
    });
  });

  it('closes modal on Cancel', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument());

    const headerBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(headerBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Record Payment').length).toBe(2);
    });

    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modal = within(modalOverlay as HTMLElement);
    fireEvent.click(modal.getByText('Cancel'));

    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });
  });

  it('deduplicates payments by ID', async () => {
    mockGetPayments.mockResolvedValue([
      samplePayments[0],
      { ...samplePayments[0], id: 'PAY-001' },
      samplePayments[1],
    ]);
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      const invoiceElements = screen.getAllByText('Invoice: INV-TA-2026-00045');
      expect(invoiceElements).toHaveLength(1);
      expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument();
    });
  });

  it('opens edit modal for Registrado payment', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    // Click the Pencil icon on the Registrado payment
    const editButtons = screen.getAllByTitle('Modifica');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(editButtons[0]);

    // Wait for edit modal
    await waitFor(() => {
      expect(screen.getByText('Modifica Pagamento')).toBeInTheDocument();
    });

    // Modal should show payment ID and Salva button
    expect(screen.getAllByText('PAY-001').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Salva')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('edit modal closes on Cancel', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Modifica');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Modifica Pagamento')).toBeInTheDocument();
    });

    // Find the Cancel button in the edit modal (last one rendered)
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Modifica Pagamento')).not.toBeInTheDocument();
    });
  });

  it('status filter shows only matching payments', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'Confirmado' } });

    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument();
    });
    expect(screen.queryByText('Invoice: INV-TA-2026-00045')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoice: INV-TA-2026-00047')).not.toBeInTheDocument();
  });

  it('date filters call getPayments with correct params', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    const dateInputs = screen.getAllByDisplayValue('');
    const dateFromInput = dateInputs.find(el => el.getAttribute('type') === 'date');
    // Find the two date inputs
    const allDateInputs = document.querySelectorAll('input[type="date"]');
    expect(allDateInputs.length).toBe(2);

    fireEvent.change(allDateInputs[0], { target: { value: '2026-07-20' } });
    fireEvent.change(allDateInputs[1], { target: { value: '2026-07-21' } });

    await waitFor(() => {
      expect(mockGetPayments).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-07-20', dateTo: '2026-07-21' })
      );
    });
  });

  it('clear button resets all filters', async () => {
    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    // Set a filter to show Clear button
    fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'Registrado' } });
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    // Clear button should be visible
    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);

    // All Status should be back to default
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00046')).toBeInTheDocument();
      expect(screen.getByText('Invoice: INV-TA-2026-00047')).toBeInTheDocument();
    });
  });

  it('export Excel generates CSV with correct headers and data', async () => {
    const captured: { content: string; type: string } = { content: '', type: '' };
    class MockBlob {
      constructor(parts: any[], opts: any) {
        captured.content = parts[0];
        captured.type = opts?.type || '';
      }
    }
    (global as any).Blob = MockBlob;
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const origCreateElement = document.createElement.bind(document);
    const mockAnchor = { click: vi.fn(), href: '', download: '' };
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as any;
      return origCreateElement(tag);
    });

    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Excel'));

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    // Verify CSV structure
    expect(captured.content).toContain('PaymentID');
    expect(captured.content).toContain('InvoiceID');
    expect(captured.content).toContain('Amount');
    expect(captured.content).toContain('PAY-001');
    expect(captured.content).toContain('INV-TA-2026-00045');
    expect(captured.type).toContain('text/csv');
    expect(mockAnchor.download).toContain('Payments_');

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('export PDF generates HTML with payment data', async () => {
    const writtenContent: string[] = [];
    const mockPrint = vi.fn();
    const mockDoc = {
      write: vi.fn((html: string) => writtenContent.push(html)),
      close: vi.fn(),
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: mockDoc,
      print: mockPrint,
    } as any);

    render(<PaymentsScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-TA-2026-00045')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(mockDoc.write).toHaveBeenCalled();
      expect(mockDoc.close).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    // Verify HTML contains payment data
    const html = writtenContent.join('');
    expect(html).toContain('Payments Report');
    expect(html).toContain('PAY-001');
    expect(html).toContain('INV-TA-2026-00045');
    expect(html).toContain('PAY-002');
    expect(html).toContain('PAY-003');
    expect(html).toContain('Transport Action ERP');

    openSpy.mockRestore();
  });
});
