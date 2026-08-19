import React, { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, Copy, Calendar, Filter, Search, LinkIcon, CheckCircle, ChevronDown, ExternalLink, X, Pencil, Download, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { gasPost, getDrivers, getProjects, DriverRecord, Project, updateDriverLink } from '../services/api';
import { ScreenId } from '../types';
import { exportToCSV, exportToPDF, formatDateExport } from '../utils/exportUtils';

// Available fields for the driver form (matches backend DEFAULT_FIELDS_SCHEMA)
const AVAILABLE_FIELDS = [
  { key: 'orarioInizio',   label: 'Ora Inizio',        type: 'time',     required: true,  defaultEnabled: true },
  { key: 'orarioFine',     label: 'Ora Fine',           type: 'time',     required: true,  defaultEnabled: true },
  { key: 'kmTotali',       label: 'KM Totali',         type: 'number',   required: true,  defaultEnabled: true },
  { key: 'diaria',         label: 'Diaria',             type: 'select',   required: false, defaultEnabled: false, options: ['nessuna', 'piena', 'mezza'] },
  { key: 'note',           label: 'Note',               type: 'textarea', required: false, defaultEnabled: false },
];

interface DriverLink {
  Token: string;
  DriverID: string;
  ProjectID: string;
  DateFrom: string;
  DateTo: string;
  Status: string;
  FieldsSchema: string;
  CreatedAt: string;
  ExpiresAt: string;
}

interface DriverLinksScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  EXPIRED: { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
  REVOKED: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
};

export default function DriverLinksScreen({ onNavigate }: DriverLinksScreenProps) {
  const { token, can } = useAuth();
  const { showToast } = useToast();
  const [links, setLinks] = useState<DriverLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Create form state
  const [driverId, setDriverId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [linkDuration, setLinkDuration] = useState<number>(1); // days after DateTo
  const [isCreating, setIsCreating] = useState(false);

  // Fields schema state — which fields to include in the driver form
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled).map(f => f.key))
  );

  // Result modal state
  const [createdLink, setCreatedLink] = useState<{ token: string; link: string; driverName: string; projectName: string; dateFrom: string; dateTo: string; expiresAt: string } | null>(null);

  // Edit modal state
  const [editingLink, setEditingLink] = useState<DriverLink | null>(null);
  const [editForm, setEditForm] = useState({ driverId: '', projectId: '', dateFrom: '', dateTo: '', fieldsSchema: 'standard' });
  const [editSelectedFields, setEditSelectedFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterDriver, setFilterDriver] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Data for selects
  const [driversList, setDriversList] = useState<DriverRecord[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  useEffect(() => { loadSelectData(); }, []);
  useEffect(() => { loadLinks(); }, [filterDriver, filterProject, filterStatus, filterDateFrom, filterDateTo]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (filterDriver) filters.driverId = filterDriver;
      if (filterProject) filters.projectId = filterProject;
      if (filterStatus) filters.status = filterStatus;
      if (filterDateFrom) filters.startDate = filterDateFrom;
      if (filterDateTo) filters.endDate = filterDateTo;
      const result = await gasPost('getDriverLinks', { token, filters });
      if (Array.isArray(result)) setLinks(result);
    } catch (err) {
      console.error('Failed to load driver links:', err);
      showToast('Error al cargar links de conductores', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectData = async () => {
    try {
      const [drivers, projects] = await Promise.all([getDrivers(), getProjects()]);
      // Deduplicate drivers by ID
      const seen = new Set<string>();
      const uniqueDrivers = (drivers || []).filter(d => {
        if (d.status === 'Deleted' || seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      setDriversList(uniqueDrivers);
      setProjectsList((Array.isArray(projects) ? projects : []).filter(p => p.status !== 'Archiviato'));
    } catch (err) {
      console.error('Failed to load select data:', err);
      showToast('Error al cargar datos', 'error');
    }
  };

  const handleCreate = async () => {
    if (!driverId || !projectId || !dateFrom || !dateTo) return;
    setIsCreating(true);
    try {
      // Build fieldsSchema from selected fields
      const fieldsSchema = AVAILABLE_FIELDS
        .filter(f => selectedFields.has(f.key))
        .map(f => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          ...(f.options ? { options: f.options } : {}),
        }));

      const result = await gasPost('generateDriverLink', {
        driverId, projectId, dateFrom, dateTo,
        linkDurationDays: linkDuration,
        fieldsSchema,
      });

      // Build the link URL from result
      const token = result?.token || result?.Token || '';
      const gasUrl = result?.link || result?.Link || '';
      const link = gasUrl || `${import.meta.env.VITE_GAS_WEBAPP_URL}?action=driverForm&token=${token}`;

      // Show result modal
      setCreatedLink({
        token,
        link,
        driverName: driverNameMap[driverId] || driverId,
        projectName: projectNameMap[projectId] || projectId,
        dateFrom,
        dateTo,
        expiresAt: result?.expiresAt || result?.ExpiresAt || '',
      });

      // Reset form
      setDriverId('');
      setProjectId('');
      setDateFrom('');
      setDateTo('');
      setLinkDuration(1);
      setSelectedFields(new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled).map(f => f.key)));
      loadLinks();
    } catch (err) {
      console.error('Failed to create link:', err);
      showToast('Error al crear link', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (linkToken: string) => {
    if (!confirm('Are you sure you want to revoke this link?')) return;
    try {
      const result = await gasPost('deactivateDriverLink', { linkToken });
      if (result?.error) {
        showToast('Error: ' + result.error, 'error');
        return;
      }
      loadLinks();
    } catch (err) {
      console.error('Failed to deactivate link:', err);
      showToast('Error al desactivar link', 'error');
      showToast('Failed to revoke link. Please try again.', 'error');
    }
  };

  const copyLink = (linkUrl: string) => {
    navigator.clipboard.writeText(linkUrl);
    setCopiedToken(linkUrl);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredLinks = links;

  const activeCount = links.filter(l => l.Status === 'ACTIVE').length;

  // Helper: safely format date string
  const safeDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('it-IT');
    } catch {
      return '—';
    }
  };

  // Build driver name lookup
  const driverNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    driversList.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [driversList]);

  // Build project name lookup
  const projectNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    projectsList.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projectsList]);

  // Export to Excel (client-side CSV generation)
  const handleExportExcel = () => {
    const headers = ['Token', 'Driver', 'DriverID', 'Project', 'ProjectID', 'DateFrom', 'DateTo', 'Status', 'CreatedAt', 'ExpiresAt'];
    const rows = filteredLinks.map(link => [
      link.Token,
      driverNameMap[link.DriverID] || link.DriverID,
      link.DriverID,
      projectNameMap[link.ProjectID] || link.ProjectID,
      link.ProjectID,
      link.DateFrom,
      link.DateTo,
      link.Status,
      link.CreatedAt,
      link.ExpiresAt
    ]);
    exportToCSV(headers, rows, 'DriverLinks');
  };

  // Export to PDF (browser print)
  const handleExportPDF = () => {
    const columns = [
      { key: 'token', label: 'Token' },
      { key: 'driver', label: 'Driver' },
      { key: 'project', label: 'Project' },
      { key: 'dateRange', label: 'Date Range' },
      { key: 'expiresAt', label: 'Expires' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
    ];
    const data = filteredLinks.map(link => ({
      token: link.Token,
      driver: driverNameMap[link.DriverID] || link.DriverID,
      project: projectNameMap[link.ProjectID] || link.ProjectID,
      dateRange: `${formatDateExport(link.DateFrom)} — ${formatDateExport(link.DateTo)}`,
      expiresAt: formatDateExport(link.ExpiresAt),
      status: link.Status,
      createdAt: formatDateExport(link.CreatedAt),
    }));
    exportToPDF('Driver Links Report', columns, data, {
      subtitle: `Total: ${filteredLinks.length} links`,
      footer: 'Transport Action ERP — Driver Links Report',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-on-surface">Driver Links</h1>
            <p className="text-xs text-on-surface-variant">Manage weekly links for driver reporting</p>
          </div>
          {links.length > 0 && (
            <span className="ml-2 px-2.5 py-0.5 text-xs font-medium bg-surface-container rounded-full text-on-surface-variant">
              {activeCount} active
            </span>
          )}
        </div>
        {can('driverLink.generate') && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-surface border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 bg-surface border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Generate Link
            </button>
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-surface-container-low border-b border-outline-variant shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
          <input
            type="text"
            placeholder="Search by driver ID..."
            value={filterDriver}
            onChange={e => setFilterDriver(e.target.value)}
            className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
        >
          <option value="">All Projects</option>
          {projectsList.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            placeholder="From"
            className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
          <span className="text-on-surface-variant">—</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            placeholder="To"
            className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
        {(filterDriver || filterProject || filterStatus || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterDriver(''); setFilterProject(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-outline-variant/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-dim rounded w-1/4" />
                    <div className="h-3 bg-surface-dim rounded w-1/3" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-16 bg-surface-dim rounded-full" />
                    <div className="h-8 w-8 bg-surface-dim rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
              <Link2 className="w-8 h-8 text-on-surface-variant/40" />
            </div>
            <p className="text-on-surface font-medium mb-1">
              {links.length === 0 ? 'No driver links yet' : 'No links match your filters'}
            </p>
            <p className="text-sm text-on-surface-variant mb-4">
              {links.length === 0
                ? 'Generate your first link to start collecting driver reports.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {links.length === 0 && can('driverLink.generate') && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Generate First Link
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-4">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total Links', value: links.length, color: 'text-on-surface' },
                { label: 'Active', value: activeCount, color: 'text-emerald-600' },
                { label: 'Expired / Revoked', value: links.length - activeCount, color: 'text-on-surface-variant' },
              ].map(stat => (
                <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3">
                  <p className="text-xs text-on-surface-variant mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Driver</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Project</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date Range</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Expires</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Created</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredLinks.map(link => {
                    const st = STATUS_CONFIG[link.Status] || STATUS_CONFIG.ACTIVE;
                    return (
                      <tr key={link.Token} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-on-surface">{driverNameMap[link.DriverID] || link.DriverID}</span>
                          {driverNameMap[link.DriverID] && <span className="text-xs text-on-surface-variant block">{link.DriverID}</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-on-surface-variant">{projectNameMap[link.ProjectID] || link.ProjectID}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm text-on-surface">
                            <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                            <span>{safeDate(link.DateFrom)}</span>
                            <span className="text-on-surface-variant">→</span>
                            <span>{safeDate(link.DateTo)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-on-surface-variant">
                          {safeDate(link.ExpiresAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {link.Status.charAt(0) + link.Status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-on-surface-variant">
                          {safeDate(link.CreatedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => copyLink(`${import.meta.env.VITE_GAS_WEBAPP_URL}?action=driverForm&token=${link.Token}`)}
                              className="p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                              title="Copy link"
                            >
                              {copiedToken === link.Token ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-on-surface-variant" />
                              )}
                            </button>
                            {link.Status === 'ACTIVE' && can('driverLink.update') && (
                              <button
                                onClick={() => {
                                  setEditingLink(link);
                                  setEditForm({
                                    driverId: link.DriverID,
                                    projectId: link.ProjectID,
                                    dateFrom: link.DateFrom?.split('T')[0] || '',
                                    dateTo: link.DateTo?.split('T')[0] || '',
                                    fieldsSchema: link.FieldsSchema || 'standard',
                                  });
                                  // Parse existing FieldsSchema JSON into selected fields
                                  try {
                                    const parsed = JSON.parse(link.FieldsSchema || '[]');
                                    if (Array.isArray(parsed)) {
                                      setEditSelectedFields(new Set(parsed.map((f: any) => f.key)));
                                    } else {
                                      // Preset string — enable required fields + defaults
                                      setEditSelectedFields(new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled || f.required).map(f => f.key)));
                                    }
                                  } catch {
                                    setEditSelectedFields(new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled || f.required).map(f => f.key)));
                                  }
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit link"
                              >
                                <Pencil className="w-4 h-4 text-blue-500" />
                              </button>
                            )}
                            {link.Status === 'ACTIVE' && can('driverLink.deactivate') && (
                              <button
                                onClick={() => handleDeactivate(link.Token)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Revoke link"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Generate Driver Link</h2>
                <p className="text-xs text-on-surface-variant">Create a new reporting link for a driver</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Driver</label>
                <div className="relative">
                  <select
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select driver...</option>
                    {driversList.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Project</label>
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select project...</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Link expires after (days from Date To)</label>
                <select
                  value={linkDuration}
                  onChange={e => setLinkDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
                >
                  <option value={0}>Same day as Date To</option>
                  <option value={1}>+1 day</option>
                  <option value={2}>+2 days</option>
                  <option value={3}>+3 days</option>
                  <option value={5}>+5 days</option>
                  <option value={7}>+7 days</option>
                  <option value={14}>+14 days</option>
                  <option value={30}>+30 days</option>
                </select>
              </div>
              {/* Fields selector */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-2">Fields included in driver form</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_FIELDS.map(field => (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] cursor-pointer transition-colors ${
                        selectedFields.has(field.key)
                          ? 'bg-primary/5 border-primary/30 text-on-surface'
                          : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-dim'
                      } ${field.required ? 'opacity-100' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(field.key)}
                        disabled={field.required}
                        onChange={e => {
                          const next = new Set(selectedFields);
                          if (e.target.checked) next.add(field.key);
                          else next.delete(field.key);
                          setSelectedFields(next);
                        }}
                        className="rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span className="flex-1">{field.label}</span>
                      {field.required && <span className="text-[10px] text-on-surface-variant/60">required</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {isCreating && (
              <div className="mt-4 space-y-2">
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-[11px] text-on-surface-variant text-center">Generating link...</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !driverId || !projectId || !dateFrom || !dateTo}
                className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCreating ? 'Creating...' : 'Generate Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal — shown after successful link creation */}
      {createdLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Link Created</h2>
                  <p className="text-xs text-on-surface-variant">Share this link with the driver</p>
                </div>
              </div>
              <button onClick={() => setCreatedLink(null)} className="p-1 hover:bg-surface-dim rounded-lg">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-[13px]">
                <span className="text-on-surface-variant">Driver</span>
                <span className="font-medium text-on-surface">{createdLink.driverName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-on-surface-variant">Project</span>
                <span className="font-medium text-on-surface">{createdLink.projectName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-on-surface-variant">Date Range</span>
                <span className="font-medium text-on-surface">{createdLink.dateFrom} → {createdLink.dateTo}</span>
              </div>
              {createdLink.expiresAt && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-on-surface-variant">Expires</span>
                  <span className="font-medium text-on-surface">{safeDate(createdLink.expiresAt)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-outline-variant">
                <label className="block text-[11px] text-on-surface-variant mb-1">Link URL</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={createdLink.link}
                    className="flex-1 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[12px] text-on-surface font-mono truncate"
                  />
                  <button
                    onClick={() => copyLink(createdLink.link)}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors shrink-0"
                  >
                    {copiedToken === createdLink.link ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={createdLink.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Link
              </a>
              <button
                onClick={() => setCreatedLink(null)}
                className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Edit Driver Link</h2>
                  <p className="text-xs text-on-surface-variant">Token: {editingLink.Token}</p>
                </div>
              </div>
              <button onClick={() => setEditingLink(null)} className="p-1 hover:bg-surface-dim rounded-lg">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Driver</label>
                <select
                  value={editForm.driverId}
                  onChange={e => setEditForm(prev => ({ ...prev, driverId: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
                >
                  <option value="">Select driver...</option>
                  {driversList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Project</label>
                <select
                  value={editForm.projectId}
                  onChange={e => setEditForm(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
                >
                  <option value="">Select project...</option>
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Date From</label>
                  <input
                    type="date"
                    value={editForm.dateFrom}
                    onChange={e => setEditForm(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Date To</label>
                  <input
                    type="date"
                    value={editForm.dateTo}
                    onChange={e => setEditForm(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Fields Schema</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FIELDS.map(field => (
                    <label key={field.key} className="flex items-center gap-1.5 text-[12px] text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required || editSelectedFields.has(field.key)}
                        disabled={field.required}
                        onChange={() => {
                          if (field.required) return;
                          setEditSelectedFields(prev => {
                            const next = new Set(prev);
                            if (next.has(field.key)) next.delete(field.key);
                            else next.add(field.key);
                            return next;
                          });
                        }}
                        className="rounded border-outline-variant"
                      />
                      {field.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingLink(null)}
                className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editForm.driverId || !editForm.projectId || !editForm.dateFrom || !editForm.dateTo) {
                    showToast('All fields are required', 'warning');
                    return;
                  }
                  setIsSaving(true);
                  try {
                    // Build fieldsSchema JSON from selected fields
                    const fieldsSchemaJson = AVAILABLE_FIELDS
                      .filter(f => editSelectedFields.has(f.key) || f.required)
                      .map(f => ({
                        key: f.key,
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        ...(f.options ? { options: f.options } : {}),
                      }));

                    const result = await updateDriverLink(editingLink.Token, {
                      DriverID: editForm.driverId,
                      ProjectID: editForm.projectId,
                      DateFrom: editForm.dateFrom,
                      DateTo: editForm.dateTo,
                      FieldsSchema: JSON.stringify(fieldsSchemaJson),
                    });
                    if (result.error) {
                      showToast('Error: ' + result.error, 'error');
                    } else {
                      setEditingLink(null);
                      loadLinks(); // Reload to show updated data
                    }
                  } catch (err: any) {
                    showToast('Error: ' + (err.message || 'Unknown error'), 'error');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
