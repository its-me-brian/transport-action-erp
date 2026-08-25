import { useState, useEffect } from 'react';
import {
  Project,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getClients,
  prepararProject,
  activarProject,
  pasarAFacturacionProject,
  pasarACobroProject,
  cerrarProject,
  getMainDashboard,
  DashboardSummary,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { StatusFilter, ClientOption, LifecycleAction } from '../utils/projectHelpers';

export function useProjects() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Add/Edit modal
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Dashboard summary
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    loadProjects();
    loadClients();
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const summary = await getMainDashboard();
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('Error al cargar dashboard', 'error');
    }
  };

  const loadClients = async () => {
    try {
      const result = await getClients();
      if (Array.isArray(result)) {
        setClients(result.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      showToast('Error al cargar clientes', 'error');
    }
  };

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await getProjects();
      if (Array.isArray(result)) {
        // Dedup by ID
        const seen = new Set<string>();
        const unique = result.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProjects(unique);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      showToast('Error al cargar proyectos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || 
             p.transportCompany.toLowerCase().includes(q) ||
             p.id.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async () => {
    if (!editProject?.name?.trim()) {
      showToast('Project name is required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createProject(token, {
          name: editProject.name!.trim(),
          clientId: editProject.clientId || '',
          transportCompany: editProject.transportCompany || '',
          operatingCompany: editProject.operatingCompany || '',
          coordinator: editProject.coordinator || '',
          status: editProject.status || 'Nuovo',
          dateFrom: editProject.dateFrom || '',
          dateTo: editProject.dateTo || '',
          notes: editProject.notes || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateProject(token, editProject as Project);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditProject(null);
      await loadProjects();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteProject(token, id);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setDeleteConfirm(null);
      await loadProjects();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleLifecycleTransition = async (projectId: string, action: LifecycleAction) => {
    const confirmMessages: Record<string, string> = {
      preparar: 'Preparare questo progetto?',
      activar: 'Attivare questo progetto?',
      pasarAFacturacion: 'Passare a fatturazione?',
      pasarACobro: 'Passare a incasso?',
      cerrar: 'Chiudere questo progetto?',
    };
    
    if (!confirm(confirmMessages[action])) return;
    
    try {
      let result;
      switch (action) {
        case 'preparar': result = await prepararProject(token, projectId); break;
        case 'activar': result = await activarProject(token, projectId); break;
        case 'pasarAFacturacion': result = await pasarAFacturacionProject(token, projectId); break;
        case 'pasarACobro': result = await pasarACobroProject(token, projectId); break;
        case 'cerrar': result = await cerrarProject(token, projectId); break;
      }
      if (result?.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        await loadProjects();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const openNew = () => {
    setIsNew(true);
    setEditProject({
      name: '',
      clientId: '',
      transportCompany: '',
      operatingCompany: '',
      coordinator: '',
      status: 'Nuovo',
      dateFrom: '',
      dateTo: '',
      notes: ''
    });
  };

  const openEdit = (p: Project) => {
    setIsNew(false);
    setEditProject({ ...p });
  };

  return {
    projects,
    clients,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    editProject,
    setEditProject,
    isSaving,
    isNew,
    deleteConfirm,
    setDeleteConfirm,
    dashboardSummary,
    filtered,
    handleSave,
    handleDelete,
    handleLifecycleTransition,
    openNew,
    openEdit,
  };
}
