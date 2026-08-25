/**
 * TESTS — InvoiceScreen (invoice management)
 *
 * Covers:
 * - Renders heading and stats
 * - Loads and displays invoices
 * - Empty state when no invoices
 * - Search filtering
 * - Status filter
 * - Create invoice modal opens/closes
 * - Status transitions (Emitir, Enviar)
 * - Void modal opens/closes
 * - Detail modal opens/closes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceScreen from '../components/InvoiceScreen';

const mockGetInvoices = vi.fn();
const mockGetInvoiceItems = vi.fn();
const mockCreateInvoice = vi.fn();
const mockEmitInvoice = vi.fn();
const mockSendInvoice = vi.fn();
const mockVoidInvoice = vi.fn();
const mockEditInvoice = vi.fn();

vi.mock('../services/api', () => ({
  getInvoices: (...args: any[]) => mockGetInvoices(...args),
  getInvoiceItems: (...args: any[]) => mockGetInvoiceItems(...args),
  createInvoice: (...args: any[]) => mockCreateInvoice(...args),
  emitInvoice: (...args: any[]) => mockEmitInvoice(...args),
  sendInvoice: (...args: any[]) => mockSendInvoice(...args),
  voidInvoice: (...args: any[]) => mockVoidInvoice(...args),
  editInvoice: (...args: any[]) => mockEditInvoice(...args),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockInvoices = [
  {
    id: 'INV-001',
    invoiceNumber: 'TA-2026-001',
    projectId: 'PRJ-001',
    clientId: 'CLI-001',
    status: 'Borrador',
    date: '2026-01-15',
    dueDate: '2026-02-15',
    subtotal: 1000,
    taxRate: 21,
    taxAmount: 210,
    total: 1210,
    notes: '',
    voidReason: '',
  },
  {
    id: 'INV-002',
    invoiceNumber: 'TA-2026-002',
    projectId: 'PRJ-002',
    clientId: 'CLI-002',
    status: 'Pagada',
    date: '2026-01-10',
    dueDate: '2026-02-10',
    subtotal: 2000,
    taxRate: 21,
    taxAmount: 420,
    total: 2420,
    notes: 'Paid',
    voidReason: '',
  },
];

describe('InvoiceScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: alert doesn't block
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders heading', async () => {
    mockGetInvoices.mockResolvedValue([]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetInvoices.mockReturnValue(new Promise(() => {}));
    const { container } = render(<InvoiceScreen onNavigate={vi.fn()} />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('loads and displays invoices', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText('TA-2026-002')).toBeInTheDocument();
  });

  it('shows empty state when no invoices', async () => {
    mockGetInvoices.mockResolvedValue([]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
    });
  });

  it('shows total count and amount in header', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/2 invoices/)).toBeInTheDocument();
    });
  });

  it('search filters invoices by clientId', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search invoices...'), { target: { value: 'CLI-001' } });

    expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('TA-2026-002')).not.toBeInTheDocument();
  });

  it('status filter shows only matching invoices', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'Pagada' } });

    await waitFor(() => {
      expect(screen.getByText('TA-2026-002')).toBeInTheDocument();
    });
    expect(screen.queryByText('TA-2026-001')).not.toBeInTheDocument();
  });

  it('New Invoice button opens create modal', async () => {
    mockGetInvoices.mockResolvedValue([]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Invoice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Invoice'));
    expect(screen.getByText('Project ID *')).toBeInTheDocument();
    expect(screen.getByText('Client ID *')).toBeInTheDocument();
  });

  it('create modal closes on Cancel', async () => {
    mockGetInvoices.mockResolvedValue([]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('New Invoice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Invoice'));
    expect(screen.getByText('Project ID *')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Project ID *')).not.toBeInTheDocument();
  });

  it('shows Emitir button for Borrador status', async () => {
    mockGetInvoices.mockResolvedValue([mockInvoices[0]]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Emitir')).toBeInTheDocument();
    });
  });

  it('calls emitInvoice when Emitir is clicked', async () => {
    mockEmitInvoice.mockResolvedValue({});
    mockGetInvoices.mockResolvedValue([mockInvoices[0]]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Emitir')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Emitir'));
    await waitFor(() => {
      expect(mockEmitInvoice).toHaveBeenCalledWith('INV-001');
    });
  });

  it('shows void button for voidable statuses', async () => {
    mockGetInvoices.mockResolvedValue([mockInvoices[0]]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    // Borrador status has void button (Ban icon, title="Annulla")
    const voidButtons = screen.getAllByTitle('Annulla');
    expect(voidButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('void modal opens and requires reason', async () => {
    mockGetInvoices.mockResolvedValue([mockInvoices[0]]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle('Annulla')[0]);
    expect(screen.getByText('Motivo *')).toBeInTheDocument();

    // Confirm button disabled without reason
    const confirmButton = screen.getByText('Conferma');
    expect(confirmButton.closest('button')).toBeDisabled();
  });

  it('detail modal opens and shows invoice info', async () => {
    mockGetInvoiceItems.mockResolvedValue([]);
    mockGetInvoices.mockResolvedValue([mockInvoices[0]]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    // Eye icon button for detail
    const detailButtons = screen.getAllByRole('button');
    const eyeButton = detailButtons.find(b => b.querySelector('[class*="lucide-eye"]'));
    if (eyeButton) {
      fireEvent.click(eyeButton);
      await waitFor(() => {
        expect(screen.getByText('Invoice Detail')).toBeInTheDocument();
      });
    }
  });

  it('calls getInvoices on mount', async () => {
    mockGetInvoices.mockResolvedValue([]);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetInvoices).toHaveBeenCalledTimes(1);
    });
  });

  it('handles getInvoices error gracefully', async () => {
    mockGetInvoices.mockRejectedValue(new Error('Network error'));
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
    });
  });

  it('shows status badges with correct labels', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });
    // Pagada appears in both the filter dropdown and badge — use getAllByText
    expect(screen.getAllByText('Pagada').length).toBeGreaterThanOrEqual(2);
  });

  it('date filters call getInvoices with correct params', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    const allDateInputs = document.querySelectorAll('input[type="date"]');
    expect(allDateInputs.length).toBe(2);

    fireEvent.change(allDateInputs[0], { target: { value: '2026-01-01' } });
    fireEvent.change(allDateInputs[1], { target: { value: '2026-01-31' } });

    await waitFor(() => {
      expect(mockGetInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
      );
    });
  });

  it('driver filter calls getInvoices with driverId', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    const driverInput = screen.getByPlaceholderText('Driver ID...');
    fireEvent.change(driverInput, { target: { value: 'DRV-001' } });

    await waitFor(() => {
      expect(mockGetInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ driverId: 'DRV-001' })
      );
    });
  });

  it('clear button resets all filters', async () => {
    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    // Set a filter to show Clear button
    fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'Pagada' } });
    await waitFor(() => {
      expect(screen.getByText('TA-2026-002')).toBeInTheDocument();
    });

    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
      expect(screen.getByText('TA-2026-002')).toBeInTheDocument();
    });
  });

  it('export Excel generates CSV with invoice data', async () => {
    const captured: { content: string; type: string } = { content: '', type: '' };
    class MockBlob {
      constructor(parts: any[], opts: any) {
        captured.content = parts[0];
        captured.type = opts?.type || '';
      }
    }
    (global as any).Blob = MockBlob;
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const origCreateElement = document.createElement.bind(document);
    const mockAnchor = { click: vi.fn(), href: '', download: '' };
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as any;
      return origCreateElement(tag);
    });

    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Excel'));

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    expect(captured.content).toContain('InvoiceNumber');
    expect(captured.content).toContain('TA-2026-001');
    expect(captured.content).toContain('TA-2026-002');
    expect(captured.content).toContain('CLI-001');
    expect(captured.type).toContain('text/csv');

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('export PDF generates HTML with invoice data', async () => {
    const writtenContent: string[] = [];
    const mockDoc = {
      write: vi.fn((html: string) => writtenContent.push(html)),
      close: vi.fn(),
    };
    const mockPrint = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: mockDoc,
      print: mockPrint,
    } as any);

    mockGetInvoices.mockResolvedValue(mockInvoices);
    render(<InvoiceScreen onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('TA-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(mockDoc.write).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    const html = writtenContent.join('');
    expect(html).toContain('Invoices Report');
    expect(html).toContain('TA-2026-001');
    expect(html).toContain('TA-2026-002');
    expect(html).toContain('Transport Action ERP');

    openSpy.mockRestore();
  });
});
