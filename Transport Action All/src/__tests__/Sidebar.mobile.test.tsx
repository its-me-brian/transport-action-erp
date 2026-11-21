/**
 * TESTS — Sidebar mobile drawer
 *
 * Cubre el comportamiento del shell en móvil:
 * - El botón ☰ abre el drawer
 * - El drawer conserva las etiquetas aunque el modo sea 'icons'
 * - El botón ✕ cierra el drawer
 * - El scroll del body se bloquea mientras está abierto
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
}));

const mockLogout = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', username: 'admin', role: 'admin' },
    logout: mockLogout,
    can: () => true,
  }),
}));

const drawer = () => document.getElementById('sidebar-container')!;

describe('Sidebar — mobile drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('opens the drawer from the hamburger', () => {
    render(<Sidebar onNavigate={vi.fn()} mode="full" onModeChange={vi.fn()} />);

    expect(drawer().className).toContain('-translate-x-full');

    fireEvent.click(screen.getByLabelText('Open navigation menu'));

    expect(drawer().className).toContain('translate-x-0');
    expect(drawer().className).toContain('w-[280px]');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('shows full labels even when the desktop mode is icons', () => {
    render(<Sidebar onNavigate={vi.fn()} mode="icons" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Open navigation menu'));

    // En modo icons el drawer móvil no debe quedar reducido a íconos
    expect(drawer().className).not.toContain('w-[68px]');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('FINANCE')).toBeInTheDocument();
  });

  it('closes the drawer with the X button and restores scroll', () => {
    render(<Sidebar onNavigate={vi.fn()} mode="full" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    expect(drawer().className).toContain('translate-x-0');

    fireEvent.click(screen.getByLabelText('Close navigation menu'));

    expect(drawer().className).toContain('-translate-x-full');
    expect(document.body.style.overflow).toBe('');
  });

  it('navigates and closes when a section is tapped', () => {
    const onNavigate = vi.fn();
    render(<Sidebar onNavigate={onNavigate} mode="full" onModeChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    fireEvent.click(screen.getByLabelText('Transport'));

    expect(onNavigate).toHaveBeenCalledWith('transport');
    expect(drawer().className).toContain('-translate-x-full');
  });
});
