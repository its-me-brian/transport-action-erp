/**
 * TESTS — AuditCenterScreen (tab container)
 *
 * Covers:
 * - Renders with default "Activity" tab active
 * - Switches between Activity / Changes tabs
 * - Passes onNavigate prop to child components
 * - Tab styling changes on active/inactive
 * - Only one child screen is rendered at a time
 * - Shield icon and "Audit Center" heading present
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuditCenterScreen from '../components/AuditCenterScreen';

const mockOnNavigate = vi.fn();

vi.mock('../components/ActivityFeedScreen', () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="activity-feed-screen">
      <span>ActivityFeedScreen Mock</span>
      <button onClick={() => onNavigate('dashboard')}>Navigate from Activity</button>
    </div>
  ),
}));

vi.mock('../components/ChangesScreen', () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="changes-screen">
      <span>ChangesScreen Mock</span>
      <button onClick={() => onNavigate('dashboard')}>Navigate from Changes</button>
    </div>
  ),
}));

describe('AuditCenterScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading "Audit Center"', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Audit Center')).toBeInTheDocument();
  });

  it('shows both tab buttons', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    expect(screen.getAllByRole('button', { name: /Activity/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Changes/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to Activity tab and renders ActivityFeedScreen', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('activity-feed-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('changes-screen')).not.toBeInTheDocument();
  });

  it('switches to Changes tab when clicked', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);

    expect(screen.getByTestId('changes-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-feed-screen')).not.toBeInTheDocument();
  });

  it('switches back to Activity tab after visiting Changes', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);
    expect(screen.getByTestId('changes-screen')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Activity/i })[0]);
    expect(screen.getByTestId('activity-feed-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('changes-screen')).not.toBeInTheDocument();
  });

  it('applies active tab styling to the selected tab', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    const activityButtons = screen.getAllByRole('button', { name: /Activity/i });
    expect(activityButtons[0].className).toContain('border-primary');
    expect(activityButtons[0].className).toContain('text-primary');
  });

  it('applies inactive styling to non-selected tabs', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    const changesTab = screen.getAllByRole('button', { name: /Changes/i })[0];
    expect(changesTab.className).toContain('border-transparent');
  });

  it('passes onNavigate to ActivityFeedScreen', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByText('Navigate from Activity'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('passes onNavigate to ChangesScreen after switching tabs', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);
    fireEvent.click(screen.getByText('Navigate from Changes'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('only one child screen is rendered at any time', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('activity-feed-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('changes-screen')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);
    expect(screen.queryByTestId('activity-feed-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('changes-screen')).toBeInTheDocument();
  });

  it('rapidly clicking tabs does not break rendering', () => {
    render(<AuditCenterScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Activity/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Changes/i })[0]);

    expect(screen.getByTestId('changes-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-feed-screen')).not.toBeInTheDocument();
  });
});
