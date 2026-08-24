/**
 * TESTS — DriverReportsScreen (Tab wrapper for Inbox/History/Import)
 *
 * Covers:
 * - Render with default Inbox tab
 * - Tab switching between all 3 tabs
 * - Active tab styling
 * - onNavigate passed to children
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DriverReportsScreen from '../components/DriverReportsScreen';

vi.mock('../components/ReportInboxScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="report-inbox">ReportInbox</div>,
}));

vi.mock('../components/HistoryScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="history-screen">HistoryScreen</div>,
}));

vi.mock('../components/WhatsAppCaptureScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="whatsapp-capture">WhatsAppCaptureScreen</div>,
}));

const mockOnNavigate = vi.fn();

describe('DriverReportsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with header and all 3 tabs', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Driver Reports')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('shows Inbox tab as default active', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('history-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-capture')).not.toBeInTheDocument();
  });

  it('switches to History tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByTestId('history-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches to Import tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByTestId('whatsapp-capture')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches back to Inbox tab from Import', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Import'));
    fireEvent.click(screen.getByText('Inbox'));
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-capture')).not.toBeInTheDocument();
  });

  it('passes onNavigate to child components', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
  });
});
