/**
 * TESTS — NewServiceScreen (service creation form)
 *
 * Covers:
 * - Renders form fields
 * - Loads projects and drivers on mount
 * - Validates required fields (project, pickup, dropoff)
 * - Submits service via createService
 * - Handles API errors on submit
 * - Navigates back on cancel / save draft
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import NewServiceScreen from '../components/NewServiceScreen';

const mockGetProjects = vi.fn();
const mockGetDrivers = vi.fn();
const mockCreateService = vi.fn();
const mockGetVehicleTypes = vi.fn();
const mockGetServiceTypes = vi.fn();

vi.mock('../services/api', () => ({
  getProjects: (...args: any[]) => mockGetProjects(...args),
  getDrivers: (...args: any[]) => mockGetDrivers(...args),
  createService: (...args: any[]) => mockCreateService(...args),
  getVehicleTypes: (...args: any[]) => mockGetVehicleTypes(...args),
  getServiceTypes: (...args: any[]) => mockGetServiceTypes(...args),
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockProjects = [
  { id: 'PRJ-001', name: 'Project Alpha' },
  { id: 'PRJ-002', name: 'Project Beta' },
];

const mockDrivers = [
  { id: 'DRV-001', name: 'Mario Rossi' },
  { id: 'DRV-002', name: 'Luigi Bianchi' },
];

describe('NewServiceScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue(mockProjects);
    mockGetDrivers.mockResolvedValue(mockDrivers);
    mockGetVehicleTypes.mockResolvedValue(['Van', 'Car']);
    mockGetServiceTypes.mockResolvedValue(['Dispo', 'Transfer Airport', 'Transfer City']);
  });

  it('renders the form heading', () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText('New Service')).toBeInTheDocument();
  });

  it('renders the form container', () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText('Save Service')).toBeInTheDocument();
  });

  it('renders company toggle buttons', () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText('Transport Action')).toBeInTheDocument();
    expect(screen.getByText('Movie Motion')).toBeInTheDocument();
  });

  it('loads projects into the dropdown on mount', async () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('loads drivers on mount', async () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(mockGetDrivers).toHaveBeenCalledTimes(1);
    });
  });

  it('validates required fields on submit', async () => {
    const onAddService = vi.fn();
    render(<NewServiceScreen onAddService={onAddService} onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Please fill out all required fields',
        'error'
      );
    });
    expect(onAddService).not.toHaveBeenCalled();
  });

  it('calls createService with correct payload on valid submit', async () => {
    mockCreateService.mockResolvedValue({ id: 'SVC-NEW-001' });
    const onAddService = vi.fn();
    const onNavigate = vi.fn();
    render(<NewServiceScreen onAddService={onAddService} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'Via Roma 1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'Via Milano 2' } });

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(mockCreateService).toHaveBeenCalledWith(
        expect.objectContaining({
          ProjectID: 'Project Alpha',
          PickupLines: ['Via Roma 1'],
          DropoffLines: ['Via Milano 2'],
        })
      );
    });
  });

  it('calls onAddService with the new service on success', async () => {
    mockCreateService.mockResolvedValue({ id: 'SVC-NEW-001' });
    const onAddService = vi.fn();
    render(<NewServiceScreen onAddService={onAddService} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'Via Roma 1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'Via Milano 2' } });

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(onAddService).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'SVC-NEW-001',
          status: 'Scheduled',
          company: 'Transport Action',
        })
      );
    });
  });

  it('navigates to transport screen after successful creation', async () => {
    mockCreateService.mockResolvedValue({ id: 'SVC-NEW-001' });
    const onNavigate = vi.fn();
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'Via Roma 1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'Via Milano 2' } });

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('transport', 'push_back');
    });
  });

  it('handles createService API error', async () => {
    mockCreateService.mockResolvedValue({ error: 'Backend failure' });
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'Via Roma 1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'Via Milano 2' } });

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Error creating service: Backend failure', 'error');
    });
  });

  it('handles createService returning no ID', async () => {
    mockCreateService.mockResolvedValue({ id: '' });
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'Via Roma 1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'Via Milano 2' } });

    fireEvent.click(screen.getByText('Save Service'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Error: backend did not return an ID', 'error');
    });
  });

  it('Cancel button navigates to dashboard', () => {
    const onNavigate = vi.fn();
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onNavigate).toHaveBeenCalledWith('dashboard', 'push_back');
  });

  it('Save Draft button navigates to dashboard', () => {
    const onNavigate = vi.fn();
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Save Draft'));
    expect(onNavigate).toHaveBeenCalledWith('dashboard', 'push_back');
  });

  it('switches company to Movie Motion', async () => {
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('Movie Motion'));

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    mockCreateService.mockResolvedValue({ id: 'SVC-002' });
    fireEvent.change(document.getElementById('project-select-field') as HTMLSelectElement, { target: { value: 'Project Alpha' } });
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), { target: { value: 'B' } });
    fireEvent.click(screen.getByText('Save Service'));

    return waitFor(() => {
      expect(mockCreateService).toHaveBeenCalledWith(
        expect.objectContaining({ OperatingCompany: 'Movie Motion' })
      );
    });
  });

  it('handles getProjects error without crashing', async () => {
    mockGetProjects.mockRejectedValue(new Error('Network'));
    render(<NewServiceScreen onAddService={vi.fn()} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalled();
    });
    expect(screen.getByText('New Service')).toBeInTheDocument();
  });
});
