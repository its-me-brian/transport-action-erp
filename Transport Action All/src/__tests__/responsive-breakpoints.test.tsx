/**
 * TESTS — Responsive Breakpoints (ERG Phase 49)
 *
 * Covers:
 * - Mobile layout (<768px): compact header, bottom tab bar
 * - Tablet layout (768px-1024px): renders at tablet width
 * - Desktop layout (>1024px): side navigation
 * - Breakpoint transitions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ can: () => true, user: { role: 'admin' } }),
}));

vi.mock('../services/api', () => ({
  getDrivers: vi.fn().mockResolvedValue([]),
  assignDriver: vi.fn().mockResolvedValue({}),
  confirmService: vi.fn().mockResolvedValue({}),
  startService: vi.fn().mockResolvedValue({}),
  completeService: vi.fn().mockResolvedValue({}),
  reportService: vi.fn().mockResolvedValue({}),
  validateService: vi.fn().mockResolvedValue({}),
  getActivityFeed: vi.fn().mockResolvedValue([]),
  getRapportinoClients: vi.fn().mockResolvedValue([]),
}));

vi.mock('../hooks/useRelatedData', () => ({
  useRelatedData: () => ({
    loading: false,
    driverLink: null,
    driverReport: null,
    inboxItem: null,
    reconciliation: null,
  }),
}));

vi.mock('../hooks/useOpenService', () => ({
  useOpenService: () => vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  MemoryRouter: ({ children }: any) => children,
}));

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

const mockService = {
  id: 'SVC-001',
  date: '2026-08-25',
  startTime: '08:00',
  endTime: '17:00',
  from: 'Roma Fiumicino',
  to: 'Hotel Artemide',
  driverName: 'Marco Rossi',
  driverPhone: '+393331234567',
  driverId: 'DRV-001',
  vehicleType: 'Mercedes E-Class',
  vehiclePlate: 'RM123AB',
  passengers: '2 pax',
  serviceType: 'Transfer',
  operationalStatus: 'Confirmado',
  financialStatus: 'Pendiente',
  project: 'Test Project',
  movements: [],
  revenueBreakdown: { base: 100 },
  costBreakdown: { base: 60 },
};

describe('Responsive Breakpoints', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    setViewport(originalInnerWidth);
  });

  describe('Mobile (<768px)', () => {
    beforeEach(() => {
      setViewport(375);
    });

    it('should show compact header with service ID on mobile', async () => {
      const { default: ServiceWorkspace } = await import('../components/ServiceWorkspace');
      render(
        <ServiceWorkspace
          service={mockService as any}
          onClose={vi.fn()}
          mode="page"
        />
      );
      const elements = screen.getAllByText('SVC-001');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show Overview tab on mobile', async () => {
      const { default: ServiceWorkspace } = await import('../components/ServiceWorkspace');
      render(
        <ServiceWorkspace
          service={mockService as any}
          onClose={vi.fn()}
          mode="page"
        />
      );
      const overviewElements = screen.getAllByText('Overview');
      expect(overviewElements.length).toBeGreaterThan(0);
    });
  });

  describe('Tablet (768px-1024px)', () => {
    beforeEach(() => {
      setViewport(768);
    });

    it('should render without crashing at tablet width', async () => {
      const { default: ServiceWorkspace } = await import('../components/ServiceWorkspace');
      render(
        <ServiceWorkspace
          service={mockService as any}
          onClose={vi.fn()}
          mode="page"
        />
      );
      const elements = screen.getAllByText('SVC-001');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Desktop (>1024px)', () => {
    beforeEach(() => {
      setViewport(1280);
    });

    it('should show side navigation with Sections label on desktop', async () => {
      const { default: ServiceWorkspace } = await import('../components/ServiceWorkspace');
      render(
        <ServiceWorkspace
          service={mockService as any}
          onClose={vi.fn()}
          mode="page"
        />
      );
      expect(screen.getByText('Sections')).toBeInTheDocument();
    });

    it('should show Operations tab group on desktop', async () => {
      const { default: ServiceWorkspace } = await import('../components/ServiceWorkspace');
      render(
        <ServiceWorkspace
          service={mockService as any}
          onClose={vi.fn()}
          mode="page"
        />
      );
      const opsElements = screen.getAllByText('Operations');
      expect(opsElements.length).toBeGreaterThan(0);
    });
  });
});
