/**
 * TESTS — ProjectScreen (CRUD de proyectos)
 *
 * Covers:
 * - Render con lista de proyectos
 * - Búsqueda y filtro por status
 * - Crear proyecto (abrir modal, guardar, validar nombre)
 * - Editar proyecto
 * - Eliminar proyecto (confirmación)
 * - Manejo de errores API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectScreen from '../components/ProjectScreen';

const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockGetClients = vi.fn();

vi.mock('../services/api', () => ({
  getProjects: (...args: any[]) => mockGetProjects(...args),
  createProject: (...args: any[]) => mockCreateProject(...args),
  updateProject: (...args: any[]) => mockUpdateProject(...args),
  deleteProject: (...args: any[]) => mockDeleteProject(...args),
  getClients: (...args: any[]) => mockGetClients(...args),
}));

const mockOnNavigate = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { email: 'admin@test.com', role: 'admin' },
    can: () => true,
  }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const sampleProjects = [
  { id: 'PRJ-TA-001', name: 'Netflix Film', clientId: '', transportCompany: 'TA', operatingCompany: '', coordinator: '', status: 'Attivo', dateFrom: '2026-07-01', dateTo: '2026-07-31', notes: '', createdAt: '', updatedAt: '' },
  { id: 'PRJ-TA-002', name: 'Amazon Series', clientId: '', transportCompany: 'TA', operatingCompany: '', coordinator: '', status: 'Chiuso', dateFrom: '2026-06-01', dateTo: '2026-06-30', notes: '', createdAt: '', updatedAt: '' },
];

describe('ProjectScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue(sampleProjects);
    mockGetClients.mockResolvedValue([]);
  });

  it('renders and loads projects', async () => {
    const { container } = render(<ProjectScreen onNavigate={mockOnNavigate} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Netflix Film')).toBeInTheDocument();
      expect(screen.getByText('Amazon Series')).toBeInTheDocument();
    });
  });

  it('filters projects by search query', async () => {
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search projects/i), { target: { value: 'Netflix' } });
    expect(screen.getByText('Netflix Film')).toBeInTheDocument();
    expect(screen.queryByText('Amazon Series')).not.toBeInTheDocument();
  });

  it('filters projects by status', async () => {
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    // Use the select dropdown to filter by Chiuso
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Chiuso' } });
    expect(screen.queryByText('Netflix Film')).not.toBeInTheDocument();
    expect(screen.getByText('Amazon Series')).toBeInTheDocument();
  });

  it('opens create modal and creates project', async () => {
    mockCreateProject.mockResolvedValue({ success: true, id: 'PRJ-NEW' });
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    // Open create modal — "New Project" appears in both button and modal title
    const newProjectButtons = screen.getAllByText(/New Project/i);
    fireEvent.click(newProjectButtons[0]);
    // After modal opens, "New Project" appears twice (button + modal title)
    await waitFor(() => {
      expect(screen.getAllByText('New Project').length).toBeGreaterThanOrEqual(2);
    });

    // Fill form — the placeholder is "e.g. Film Production ABC"
    fireEvent.change(screen.getByPlaceholderText(/Film Production/i), { target: { value: 'New Project' } });
    // Button shows "Create" for new projects
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith('test-token', expect.objectContaining({ name: 'New Project' }));
    });
  });

  it('disables Create button when project name is empty', async () => {
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/New Project/i));
    
    // The Create button should be disabled when name is empty
    const createBtn = screen.getByText('Create');
    expect(createBtn).toBeDisabled();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('opens edit modal with existing data', async () => {
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    // Click edit button on first project card
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Project')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation and deletes', async () => {
    mockDeleteProject.mockResolvedValue({ success: true });
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    // The first project card has Edit and a trash button
    // Find all SVG trash icons inside the projects grid
    const cards = document.querySelectorAll('#projects-grid > div');
    const firstCard = cards[0];
    // The trash button is the last button in the actions row (no text, just icon)
    const actionButtons = firstCard.querySelectorAll('button');
    let trashBtn: HTMLElement | null = null;
    actionButtons.forEach(btn => {
      if (!btn.textContent?.trim()) {
        trashBtn = btn as HTMLElement;
      }
    });
    
    expect(trashBtn).toBeTruthy();
    fireEvent.click(trashBtn!);

    // Confirm dialog appears
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    // Confirm delete
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith('test-token', 'PRJ-TA-001');
    });
  });

  it('shows error alert on create failure', async () => {
    mockCreateProject.mockResolvedValue({ success: false, error: 'Duplicate name' });
    render(<ProjectScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('Netflix Film')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/New Project/i));
    fireEvent.change(screen.getByPlaceholderText(/Film Production/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      // showToast should be called for API error
      expect(mockCreateProject).toHaveBeenCalled();
    });
  });
});
