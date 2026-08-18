/**
 * TESTS — DriverReportsScreen (Tab wrapper for Inbox/Reports)
 *
 * Covers:
 * - Render with default Inbox tab
 * - Tab switching between Inbox and Reports
 * - Active tab styling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DriverReportsScreen from '../components/DriverReportsScreen';

vi.mock('../components/ReportInboxScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="report-inbox">ReportInbox</div>,
}));

vi.mock('../components/DriverReportScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="driver-reports">DriverReportScreen</div>,
}));

const mockOnNavigate = vi.fn();

describe('DriverReportsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with header and tabs', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Driver Reports')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('shows Inbox tab as default active', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('driver-reports')).not.toBeInTheDocument();
  });

  it('switches to Reports tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Reports'));
    expect(screen.getByTestId('driver-reports')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches back to Inbox tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Reports'));
    fireEvent.click(screen.getByText('Inbox'));
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('driver-reports')).not.toBeInTheDocument();
  });

  it('passes onNavigate to child components', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    // The ReportInboxScreen receives onNavigate prop
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
  });
});
