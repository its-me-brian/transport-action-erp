/**
 * TESTS — AccountingScreen (tab container)
 *
 * Covers:
 * - Renders with default "Invoices" tab active
 * - Switches between Invoices / Payments / Expenses tabs
 * - Passes onNavigate prop to child components
 * - Tab styling changes on active/inactive
 * - Only one child screen is rendered at a time
 * - DollarSign icon and "Accounting" heading present
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountingScreen from '../components/AccountingScreen';

const mockOnNavigate = vi.fn();

vi.mock('../components/InvoiceScreen', () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="invoice-screen">
      <span>InvoiceScreen Mock</span>
      <button onClick={() => onNavigate('dashboard')}>Navigate from Invoices</button>
    </div>
  ),
}));

vi.mock('../components/PaymentsScreen', () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="payments-screen">
      <span>PaymentsScreen Mock</span>
      <button onClick={() => onNavigate('dashboard')}>Navigate from Payments</button>
    </div>
  ),
}));

vi.mock('../components/ExpenseScreen', () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="expense-screen">
      <span>ExpenseScreen Mock</span>
      <button onClick={() => onNavigate('dashboard')}>Navigate from Expenses</button>
    </div>
  ),
}));

describe('AccountingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading and DollarSign icon', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Accounting')).toBeInTheDocument();
  });

  it('shows all three tab buttons', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    // Use getAllByRole because mock buttons also contain the tab label text
    expect(screen.getAllByRole('button', { name: /Invoices/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Payments/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Expenses/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to Invoices tab and renders InvoiceScreen', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('invoice-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('payments-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();
  });

  it('switches to Payments tab when clicked', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Payments/i }));

    expect(screen.getByTestId('payments-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('invoice-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();
  });

  it('switches to Expenses tab when clicked', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }));

    expect(screen.getByTestId('expense-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('invoice-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payments-screen')).not.toBeInTheDocument();
  });

  it('switches back to Invoices tab after visiting Expenses', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }));
    expect(screen.getByTestId('expense-screen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Invoices/i }));
    expect(screen.getByTestId('invoice-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();
  });

  it('applies active tab styling to the selected tab', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    // The first button matching "Invoices" is the tab; the second is from the mock child
    const invoicesButtons = screen.getAllByRole('button', { name: /Invoices/i });
    expect(invoicesButtons[0].className).toContain('border-primary');
    expect(invoicesButtons[0].className).toContain('text-primary');
  });

  it('applies inactive styling to non-selected tabs', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    const paymentsTab = screen.getByRole('button', { name: /Payments/i });
    const expensesTab = screen.getByRole('button', { name: /Expenses/i });
    expect(paymentsTab.className).toContain('border-transparent');
    expect(expensesTab.className).toContain('border-transparent');
  });

  it('passes onNavigate to InvoiceScreen', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Navigate from Invoices'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('passes onNavigate to PaymentsScreen after switching tabs', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Payments/i }));
    fireEvent.click(screen.getByText('Navigate from Payments'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('passes onNavigate to ExpenseScreen after switching tabs', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }));
    fireEvent.click(screen.getByText('Navigate from Expenses'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('only one child screen is rendered at any time', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    // Start on Invoices
    expect(screen.getByTestId('invoice-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('payments-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();

    // Switch to Payments
    fireEvent.click(screen.getByRole('button', { name: /Payments/i }));
    expect(screen.queryByTestId('invoice-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('payments-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();

    // Switch to Expenses
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }));
    expect(screen.queryByTestId('invoice-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payments-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('expense-screen')).toBeInTheDocument();
  });

  it('rapidly clicking tabs does not break rendering', () => {
    render(<AccountingScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Payments/i }));
    fireEvent.click(screen.getByRole('button', { name: /Expenses/i }));
    fireEvent.click(screen.getByRole('button', { name: /Invoices/i }));
    fireEvent.click(screen.getByRole('button', { name: /Payments/i }));

    expect(screen.getByTestId('payments-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('invoice-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('expense-screen')).not.toBeInTheDocument();
  });
});
