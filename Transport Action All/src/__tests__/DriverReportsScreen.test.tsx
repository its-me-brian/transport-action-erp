/**
 * TESTS — DriverReportsScreen (Tab wrapper for Inbox/Reports/Submissions/WhatsApp)
 *
 * Covers:
 * - Render with default Inbox tab
 * - Tab switching between all 4 tabs
 * - Active tab styling
 * - onNavigate passed to children
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

vi.mock('../components/DriverSubmissionsScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="driver-submissions">DriverSubmissionsScreen</div>,
}));

vi.mock('../components/WhatsAppCaptureScreen', () => ({
  default: ({ onNavigate }: any) => <div data-testid="whatsapp-capture">WhatsAppCaptureScreen</div>,
}));

const mockOnNavigate = vi.fn();

describe('DriverReportsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with header and all 4 tabs', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Driver Reports')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('shows Inbox tab as default active', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('driver-reports')).not.toBeInTheDocument();
    expect(screen.queryByTestId('driver-submissions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-capture')).not.toBeInTheDocument();
  });

  it('switches to Reports tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Reports'));
    expect(screen.getByTestId('driver-reports')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches to Submissions tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Submissions'));
    expect(screen.getByTestId('driver-submissions')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches to WhatsApp tab', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('WhatsApp'));
    expect(screen.getByTestId('whatsapp-capture')).toBeInTheDocument();
    expect(screen.queryByTestId('report-inbox')).not.toBeInTheDocument();
  });

  it('switches back to Inbox tab from WhatsApp', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('WhatsApp'));
    fireEvent.click(screen.getByText('Inbox'));
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('whatsapp-capture')).not.toBeInTheDocument();
  });

  it('passes onNavigate to child components', () => {
    render(<DriverReportsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('report-inbox')).toBeInTheDocument();
  });
});
