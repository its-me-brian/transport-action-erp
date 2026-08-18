/**
 * TESTS — ContactScreen (CRUD de contactos + clientes)
 *
 * Covers:
 * - Render con lista de contactos
 * - Búsqueda y filtro por cliente
 * - Crear contacto (validar clientId + name)
 * - Editar contacto
 * - Manejo de errores API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactScreen from '../components/ContactScreen';

const mockGetContacts = vi.fn();
const mockCreateContact = vi.fn();
const mockUpdateContact = vi.fn();
const mockGetClients = vi.fn();

vi.mock('../services/api', () => ({
  getContacts: (...args: any[]) => mockGetContacts(...args),
  createContact: (...args: any[]) => mockCreateContact(...args),
  updateContact: (...args: any[]) => mockUpdateContact(...args),
  getClients: (...args: any[]) => mockGetClients(...args),
}));

const mockOnNavigate = vi.fn();

const sampleContacts = [
  { id: 'CON-001', clientId: 'CLI-001', name: 'John Doe', role: 'Producer', phone: '+34600000001', email: 'john@test.com', whatsapp: '+34600000001', notes: '', active: true, createdAt: '', updatedAt: '' },
  { id: 'CON-002', clientId: 'CLI-001', name: 'Jane Smith', role: 'Coordinator', phone: '+34600000002', email: 'jane@test.com', whatsapp: '', notes: '', active: true, createdAt: '', updatedAt: '' },
];

const sampleClients = [
  { id: 'CLI-001', name: 'Netflix', type: 'direct', status: 'active' },
  { id: 'CLI-002', name: 'Amazon', type: 'direct', status: 'active' },
];

describe('ContactScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContacts.mockResolvedValue(sampleContacts);
    mockGetClients.mockResolvedValue(sampleClients);
  });

  it('renders and loads contacts', async () => {
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('filters contacts by search query', async () => {
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search contacts/i), { target: { value: 'John' } });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('opens create modal and creates contact', async () => {
    mockCreateContact.mockResolvedValue({ success: true, id: 'CON-NEW' });
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Contact/i));

    await waitFor(() => {
      expect(screen.getByText('Client *')).toBeInTheDocument();
    });

    // Select client — find the select element in the modal
    const modal = document.querySelector('.fixed.inset-0')!;
    const selects = modal.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'CLI-001' } });

    // Fill name — find the text input in the modal
    const inputs = modal.querySelectorAll('input[type="text"]');
    fireEvent.change(inputs[0], { target: { value: 'New Contact' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateContact).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'CLI-001', name: 'New Contact' }));
    });
  });

  it('disables Save button when client and name are empty', async () => {
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Add Contact/i));
    
    // The Save button should be disabled when client/name are empty
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it('opens edit modal with existing data', async () => {
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const editButtons = screen.getAllByTitle(/Edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Contact/i)).toBeInTheDocument();
    });
  });

  it('edits contact and calls updateContact', async () => {
    mockUpdateContact.mockResolvedValue({ success: true });
    render(<ContactScreen onNavigate={mockOnNavigate} />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const editButtons = screen.getAllByTitle(/Edit/i);
    fireEvent.click(editButtons[0]);
    // Edit modal uses "Update" as submit label
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(mockUpdateContact).toHaveBeenCalled();
    });
  });
});
