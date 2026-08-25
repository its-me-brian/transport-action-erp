import React, { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, Copy, Calendar, Search, CheckCircle, Pencil, Download, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { gasPost, getDrivers, getProjects, DriverRecord, Project } from '../services/api';
import { ScreenId } from '../types';
import { exportToCSV, exportToPDF, formatDateExport } from '../utils/exportUtils';
import CreateLinkModal from './CreateLinkModal';
import EditLinkModal from './EditLinkModal';

export const AVAILABLE_FIELDS = [
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

interface LinkRowProps {
  link: DriverLink;
  driverNameMap: Record<string, string>;
  projectNameMap: Record<string, string>;
  copiedToken: string | null;
  copyLink: (linkUrl: string) => void;
  setEditingLink: (link: DriverLink | null) => void;
  handleDeactivate: (token: string) => void;
  can: (permission: string) => boolean;
}

const LinkRow = React.memo(function LinkRow({ link, driverNameMap, projectNameMap, copiedToken, copyLink, setEditingLink, handleDeactivate, can }: LinkRowProps) {
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
              onClick={() => setEditingLink(link)}
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
});

export default function DriverLinksScreen({ onNavigate }: DriverLinksScreenProps) {
  const { token, can } = useAuth();
  const { showToast } = useToast();
  const [links, setLinks] = useState<DriverLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [createdLink, setCreatedLink] = useState<{ token: string; link: string; driverName: string; projectName: string; dateFrom: string; dateTo: string; expiresAt: string } | null>(null);
  const [editingLink, setEditingLink] = useState<DriverLink | null>(null);

  const [filterDriver, setFilterDriver] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [driversList, setDriversList] = useState<DriverRecord[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  useEffect(() => { loadSelectData(); }, []);
  useEffect(() => { loadLinks(); }, [filterDriver, filterProject, filterStatus, filterDateFrom, filterDateTo]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
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

  const handleCreateLink = async (driverId: string, projectId: string, dateFrom: string, dateTo: string, linkDuration: number, selectedFields: Set<string>) => {
    setIsCreating(true);
    try {
      const fieldsSchema = AVAILABLE_FIELDS
        .filter(f => selectedFields.has(f.key))
        .map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required, ...(f.options ? { options: f.options } : {}) }));

      const result = await gasPost('generateDriverLink', {
        driverId, projectId, dateFrom, dateTo,
        linkDurationDays: linkDuration,
        fieldsSchema,
      });

      const tk = result?.token || result?.Token || '';
      const link = `${import.meta.env.VITE_GAS_WEBAPP_URL}?action=driverForm&token=${tk}`;

      const dnMap = Object.fromEntries(driversList.map(d => [d.id, d.name]));
      const pnMap = Object.fromEntries(projectsList.map(p => [p.id, p.name]));

      setCreatedLink({
        token: tk,
        link,
        driverName: dnMap[driverId] || driverId,
        projectName: pnMap[projectId] || projectId,
        dateFrom,
        dateTo,
        expiresAt: result?.expiresAt || result?.ExpiresAt || '',
      });
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
    }
  };

  const copyLink = (linkUrl: string) => {
    navigator.clipboard.writeText(linkUrl);
    setCopiedToken(linkUrl);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const activeCount = links.filter(l => l.Status === 'ACTIVE').length;
  const filteredLinks = links;

  const driverNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    driversList.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [driversList]);

  const projectNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    projectsList.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projectsList]);

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
    <div className="flex flex-col h-full pb-24">
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-outline-variant shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link2 className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-on-surface truncate">Driver Links</h1>
            <p className="text-xs text-on-surface-variant hidden sm:block">Manage weekly links for driver reporting</p>
          </div>
          {links.length > 0 && (
            <span className="ml-1 sm:ml-2 px-2 py-0.5 text-[11px] sm:text-xs font-medium bg-surface-container rounded-full text-on-surface-variant shrink-0">
              {activeCount} active
            </span>
          )}
        </div>
        {can('driverLink.generate') && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Generate Link</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-3 bg-surface-container-low border-b border-outline-variant shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              type="text"
              placeholder="Search by driver ID..."
              aria-label="Search by driver ID"
              value={filterDriver}
              onChange={e => setFilterDriver(e.target.value)}
              className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer shrink-0"
            >
              <option value="">All Projects</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer shrink-0"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
            <div className="flex items-center gap-1 shrink-0">
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
          </div>
        </div>
        {(filterDriver || filterProject || filterStatus || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterDriver(''); setFilterProject(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors cursor-pointer mt-2 sm:mt-0"
          >
            Clear filters
          </button>
        )}
      </div>

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
          <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
              {[
                { label: 'Total Links', value: links.length, color: 'text-on-surface' },
                { label: 'Active', value: activeCount, color: 'text-emerald-600' },
                { label: 'Expired / Revoked', value: links.length - activeCount, color: 'text-on-surface-variant' },
              ].map(stat => (
                <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                  <p className="text-[10px] sm:text-xs text-on-surface-variant mb-1">{stat.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
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
                    return (
                      <LinkRow
                        key={link.Token}
                        link={link}
                        driverNameMap={driverNameMap}
                        projectNameMap={projectNameMap}
                        copiedToken={copiedToken}
                        copyLink={copyLink}
                        setEditingLink={setEditingLink}
                        handleDeactivate={handleDeactivate}
                        can={can}
                      />
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateLinkModal
          onClose={() => { setShowCreate(false); setCreatedLink(null); }}
          onCreate={handleCreateLink}
          isCreating={isCreating}
          driversList={driversList}
          projectsList={projectsList}
          createdLink={createdLink}
          onDismissResult={() => { setCreatedLink(null); setShowCreate(false); }}
          copiedLink={copiedToken}
          onCopyLink={copyLink}
        />
      )}

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          driversList={driversList}
          projectsList={projectsList}
          onClose={() => setEditingLink(null)}
          onSaved={() => { setEditingLink(null); loadLinks(); }}
        />
      )}
    </div>
  );
}
