/**
 * TESTS — FinancialDashboard (financial overview + KPIs)
 *
 * Covers:
 * - Render with data (KPIs, payments, expenses)
 * - Loading state
 * - Empty state for payments/expenses
 * - KPI calculations (total received, confirmed expenses, balance, pending rapportinos)
 * - Estimated vs Actual display
 * - Percentage variance (positive and negative)
 * - Quick navigation links
 * - API error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialDashboard from '../components/FinancialDashboard';

const mockGetPayments = vi.fn();
const mockGetExpenses = vi.fn();
const mockGetRapportinoClients = vi.fn();
const mockGetRapportinoDrivers = vi.fn();
const mockGetProjects = vi.fn();
const mockGetDrivers = vi.fn();
const mockGetEstimatedVsActual = vi.fn();
const mockGetProfitByProject = vi.fn();
const mockGetProfitByDriver = vi.fn();
const mockGetProfitByCompany = vi.fn();
const mockGetCashFlow = vi.fn();

vi.mock('../services/api', () => ({
  getPayments: (...args: any[]) => mockGetPayments(...args),
  getExpenses: (...args: any[]) => mockGetExpenses(...args),
  getRapportinoClients: (...args: any[]) => mockGetRapportinoClients(...args),
  getRapportinoDrivers: (...args: any[]) => mockGetRapportinoDrivers(...args),
  getProjects: (...args: any[]) => mockGetProjects(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
  getEstimatedVsActual: (...args: any[]) => mockGetEstimatedVsActual(...args),
  getProfitByProject: (...args: any[]) => mockGetProfitByProject(...args),
  getProfitByDriver: (...args: any[]) => mockGetProfitByDriver(...args),
  getProfitByCompany: (...args: any[]) => mockGetProfitByCompany(...args),
  getCashFlow: (...args: any[]) => mockGetCashFlow(...args),
}));

const mockOnNavigate = vi.fn();

const samplePayments = [
  { id: 'PAY-001', invoiceId: 'INV-001', clientId: 'C1', amount: 1500, paymentMethod: 'transfer', paymentDate: '2026-07-20', reference: 'REF-1', notes: '', status: 'Confirmado', createdBy: 'admin', createdAt: '', confirmedAt: '', reconciledAt: '', clientName: 'Acme Corp' },
  { id: 'PAY-002', invoiceId: 'INV-002', clientId: 'C2', amount: 800, paymentMethod: 'cash', paymentDate: '2026-07-18', reference: 'REF-2', notes: '', status: 'Confirmado', createdBy: 'admin', createdAt: '', confirmedAt: '', reconciledAt: '', clientName: 'Globex' },
];

const sampleExpenses = [
  { id: 'EXP-001', ownerType: 'empresa', ownerId: 'TA', category: 'fuel', description: 'Gas station', amount: 200, expenseDate: '2026-07-20', accountingDate: '2026-07-20', status: 'confirmed', projectId: '', operatingCompany: 'TA', createdBy: 'admin', createdAt: '', updatedAt: '' },
  { id: 'EXP-002', ownerType: 'empresa', ownerId: 'TA', category: 'tolls', description: 'Highway tolls', amount: 50, expenseDate: '2026-07-19', accountingDate: '2026-07-19', status: 'draft', projectId: '', operatingCompany: 'TA', createdBy: 'admin', createdAt: '', updatedAt: '' },
];

const sampleClientRapportinos = [
  { id: 'RC-001', projectId: 'P1', clientId: 'C1', periodType: 'weekly', periodStart: '', periodEnd: '', weekStart: '', weekEnd: '', status: 'Facturado', notes: '', createdBy: '', createdAt: '', updatedAt: '', sentAt: '', acceptedAt: '' },
  { id: 'RC-002', projectId: 'P1', clientId: 'C2', periodType: 'weekly', periodStart: '', periodEnd: '', weekStart: '', weekEnd: '', status: 'Draft', notes: '', createdBy: '', createdAt: '', updatedAt: '', sentAt: '', acceptedAt: '' },
];

const sampleDriverRapportinos = [
  { id: 'RD-001', projectId: 'P1', driverId: 'D1', periodType: 'weekly', periodStart: '', periodEnd: '', weekStart: '', weekEnd: '', status: 'Pagado', notes: '', createdBy: '', createdAt: '', updatedAt: '', sentAt: '', paidAt: '' },
  { id: 'RD-002', projectId: 'P1', driverId: 'D2', periodType: 'weekly', periodStart: '', periodEnd: '', weekStart: '', weekEnd: '', status: 'Pending', notes: '', createdBy: '', createdAt: '', updatedAt: '', sentAt: '', paidAt: '' },
];

const sampleProjects = [
  { id: 'P1', name: 'Project Alpha', clientId: '', transportCompany: '', operatingCompany: '', coordinator: '', status: 'Attivo', dateFrom: '', dateTo: '', notes: '', createdAt: '', updatedAt: '' },
  { id: 'P2', name: 'Project Beta', clientId: '', transportCompany: '', operatingCompany: '', coordinator: '', status: 'Chiuso', dateFrom: '', dateTo: '', notes: '', createdAt: '', updatedAt: '' },
];

describe('FinancialDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPayments.mockResolvedValue(samplePayments);
    mockGetExpenses.mockResolvedValue(sampleExpenses);
    mockGetRapportinoClients.mockResolvedValue(sampleClientRapportinos);
    mockGetRapportinoDrivers.mockResolvedValue(sampleDriverRapportinos);
    mockGetProjects.mockResolvedValue(sampleProjects);
    mockGetDrivers.mockResolvedValue([]);
    mockGetCashFlow.mockResolvedValue({ movements: [], summary: { totalIncome: 0, totalExpense: 0, balance: 0 } });
  });

  it('shows loading state initially', () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders KPI cards with correct values after load', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });
    // Total Received = 1500 + 800 = 2300
    expect(screen.getByText('Total Received')).toBeInTheDocument();
    expect(screen.getByText(/2300,00 €/)).toBeInTheDocument();
    // Confirmed Expenses = 200 (only confirmed)
    expect(screen.getByText('Confirmed Expenses')).toBeInTheDocument();
    // 200,00 € appears in KPI card AND in the expense list row
    const twoHundredMatches = screen.getAllByText(/200,00 €/);
    expect(twoHundredMatches.length).toBeGreaterThanOrEqual(2);
    // Balance = 2300 - 200 = 2100
    const balanceMatches = screen.getAllByText('Balance');
    expect(balanceMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2100,00 €/)).toBeInTheDocument();
  });

  it('displays pending rapportinos count', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });
    // Client pending: RC-002 (status !== Facturado) = 1
    // Driver pending: RD-002 (status !== Pagado) = 1
    // Total pending = 2
    expect(screen.getByText('Pending Rapportinos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/2 unpaid rapportinos/)).toBeInTheDocument();
  });

  it('renders quick access navigation buttons', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });
    expect(screen.getByText('Payments')).toBeInTheDocument();
    const expensesMatches = screen.getAllByText('Expenses');
    expect(expensesMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rapportinos')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('calls onNavigate when a quick link is clicked', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Payments'));
    expect(mockOnNavigate).toHaveBeenCalledWith('payments');
    const expensesButtons = screen.getAllByText('Expenses');
    fireEvent.click(expensesButtons[0]);
    expect(mockOnNavigate).toHaveBeenCalledWith('expenses');
  });

  it('displays recent payments list', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('displays recent expenses list', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Gas station')).toBeInTheDocument();
    });
    expect(screen.getByText('Highway tolls')).toBeInTheDocument();
  });

  it('shows empty state when no payments', async () => {
    mockGetPayments.mockResolvedValue({ payments: [] });
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('No payments recorded')).toBeInTheDocument();
    });
  });

  it('shows empty state when no expenses', async () => {
    mockGetExpenses.mockResolvedValue([]);
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('No expenses recorded')).toBeInTheDocument();
    });
  });

  it('shows Estimated vs Actual placeholder when no project selected', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Select a project to compare estimated vs actual')).toBeInTheDocument();
    });
  });

  it('loads and displays estimated vs actual data when project is selected', async () => {
    mockGetEstimatedVsActual.mockResolvedValue({
      projectId: 'P1',
      serviceCount: 10,
      estimated: { revenue: 10000, cost: 6000, profit: 4000, margin: 40.0 },
      actual: { revenue: 12000, cost: 5500, profit: 6500, margin: 54.2 },
      variance: { revenuePercent: 20.0, costPercent: -8.3, profitPercent: 62.5, revenueAbs: 2000, costAbs: -500, profitAbs: 2500 },
    });

    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });

    // Select a project
    const selects = screen.getAllByDisplayValue('Select project...');
    fireEvent.change(selects[0], { target: { value: 'P1' } });

    await waitFor(() => {
      expect(mockGetEstimatedVsActual).toHaveBeenCalledWith('P1');
      // Text is split across JSX elements, use getAllByText
      const servicesMatches = screen.getAllByText((content, node) => {
        return node?.textContent?.includes('10 services') || false;
      });
      expect(servicesMatches.length).toBeGreaterThanOrEqual(1);
    });

    // Check variance percentages
    expect(screen.getByText('+20.0%')).toBeInTheDocument();
    expect(screen.getByText('-8.3%')).toBeInTheDocument();
    expect(screen.getByText('+62.5%')).toBeInTheDocument();

    // Check margin info — text is split across elements
    const marginMatches = screen.getAllByText((content, node) => {
      return node?.textContent?.includes('40.0% est.') || false;
    });
    expect(marginMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays "No data available" when estimated vs actual returns null', async () => {
    mockGetEstimatedVsActual.mockResolvedValue(null);

    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue('Select project...');
    fireEvent.change(selects[0], { target: { value: 'P1' } });

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockGetPayments.mockRejectedValue(new Error('Network error'));
    mockGetExpenses.mockRejectedValue(new Error('Network error'));
    mockGetRapportinoClients.mockRejectedValue(new Error('Network error'));
    mockGetRapportinoDrivers.mockRejectedValue(new Error('Network error'));
    mockGetProjects.mockRejectedValue(new Error('Network error'));

    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.queryByText('Financial Overview')).toBeInTheDocument();
    });
    // Should still render with zero data, no crash
    expect(screen.getByText('Total Received')).toBeInTheDocument();
  });

  it('calculates negative balance correctly', async () => {
    mockGetPayments.mockResolvedValue([{ ...samplePayments[0], amount: 100 }]);
    mockGetExpenses.mockResolvedValue([sampleExpenses[0]]); // 200 confirmed

    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });
    // Balance = 100 - 200 = -100
    expect(screen.getByText(/-100,00 €/)).toBeInTheDocument();
  });

  it('shows loading spinner for estimated vs actual section', async () => {
    mockGetEstimatedVsActual.mockReturnValue(new Promise(() => {})); // never resolves

    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue('Select project...');
    fireEvent.change(selects[0], { target: { value: 'P1' } });

    await waitFor(() => {
      // The loading state in the EvA section shows "Loading..."
      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('populates project dropdown with fetched projects', async () => {
    render(<FinancialDashboard onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });

    const selects = screen.getAllByDisplayValue('Select project...');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const projectAlphaMatches = screen.getAllByText('Project Alpha');
    expect(projectAlphaMatches.length).toBeGreaterThanOrEqual(1);
    const projectBetaMatches = screen.getAllByText('Project Beta');
    expect(projectBetaMatches.length).toBeGreaterThanOrEqual(1);
  });
});
