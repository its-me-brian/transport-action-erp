import React, { useState, useEffect } from 'react';
import { Send, Filter, Eye, X, ExternalLink } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getDriverLinkResponses, getDrivers, getProjects, DriverLinkResponse } from '../services/api';

interface Props {
  onNavigate: (screen: string) => void;
}

export default function DriverSubmissionsScreen({ onNavigate: _onNavigate }: Props) {
  const { showToast } = useToast();
  const [items, setItems] = useState<DriverLinkResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<DriverLinkResponse | null>(null);

  // ID → Name lookup maps
  const [driverMap, setDriverMap] = useState<Record<string, string>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});

  // Filters
  const [filterDriver, setFilterDriver] = useState('');
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    loadItems();
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const [drivers, projects] = await Promise.all([getDrivers(), getProjects()]);
      const dMap: Record<string, string> = {};
      if (Array.isArray(drivers)) drivers.forEach((d: Record<string, any>) => { dMap[String(d.id)] = String(d.name || d.id); });
      const pMap: Record<string, string> = {};
      if (Array.isArray(projects)) projects.forEach((p: Record<string, any>) => { pMap[String(p.id)] = String(p.name || p.id); });
      setDriverMap(dMap);
      setProjectMap(pMap);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  const driverName = (id: string) => driverMap[id] || id;
  const projectName = (id: string) => projectMap[id] || id;

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const result = await getDriverLinkResponses();
      if (Array.isArray(result)) {
        setItems(result);
      }
    } catch (err) {
      console.error('Failed to load driver submissions:', err);
      showToast('Error al cargar las sumisiones', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filterDriver && item.DriverID !== filterDriver) return false;
    if (filterProject && item.ProjectID !== filterProject) return false;
    return true;
  });

  // Unique drivers and projects for filter dropdowns (resolved names)
  const uniqueDrivers = [...new Set(items.map(i => i.DriverID))].sort()
    .map((id: string) => ({ id, name: driverName(id) }));
  const uniqueProjects = [...new Set(items.map(i => i.ProjectID))].sort()
    .map((id: string) => ({ id, name: projectName(id) }));

  const formatTime = (t: string) => {
    if (!t) return '—';
    return t;
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatDateTime = (d: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Driver Submissions</h1>
        <p className="text-sm text-on-surface-variant mt-1">Raw responses from Rapportino form submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-on-surface">{items.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Total Submissions</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-primary">{uniqueDrivers.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Drivers</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-primary">{uniqueProjects.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Projects</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <select
            value={filterDriver}
            onChange={e => setFilterDriver(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
          >
            <option value="">All Drivers</option>
            {uniqueDrivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
        >
          <option value="">All Projects</option>
          {uniqueProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Service Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Start</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">End</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">KM</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Diaria</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Submitted</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-10 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-28 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-7 w-7 bg-surface-dim rounded ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No submissions found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Service Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Start</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">End</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">KM</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Diaria</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Submitted</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredItems.map(item => (
                <tr key={item.ID} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{driverName(item.DriverID)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{projectName(item.ProjectID)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(item.DataServizio)}</td>
                  <td className="px-4 py-3 text-sm font-mono">{formatTime(item.OrarioInizio)}</td>
                  <td className="px-4 py-3 text-sm font-mono">{formatTime(item.OrarioFine)}</td>
                  <td className="px-4 py-3 text-sm">{item.KmTotali || 0}</td>
                  <td className="px-4 py-3 text-sm">{item.Diaria || 'nessuna'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDateTime(item.SubmittedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-on-surface-variant" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-on-surface">Submission Details</h2>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-surface-container rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">ID</span>
                <span className="font-mono text-xs">{selectedItem.ID}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Driver</span>
                <span className="font-medium">{driverName(selectedItem.DriverID)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Project</span>
                <span>{projectName(selectedItem.ProjectID)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Service Date</span>
                <span>{formatDate(selectedItem.DataServizio)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Service ID</span>
                <span className="font-mono text-xs">{selectedItem.ServiceID || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Type</span>
                <span>{selectedItem.TipoServizio || 'TRANSFER'}</span>
              </div>

              <div className="mt-4 mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Schedule</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container rounded-lg p-3">
                  <div className="text-xs text-on-surface-variant">Start Time</div>
                  <div className="text-lg font-bold font-mono">{formatTime(selectedItem.OrarioInizio)}</div>
                </div>
                <div className="bg-surface-container rounded-lg p-3">
                  <div className="text-xs text-on-surface-variant">End Time</div>
                  <div className="text-lg font-bold font-mono">{formatTime(selectedItem.OrarioFine)}</div>
                </div>
              </div>

              <div className="mt-4 mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Details</div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">KM Totali</span>
                <span className="font-bold">{selectedItem.KmTotali || 0} km</span>
              </div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Diaria</span>
                <span>{selectedItem.Diaria || 'nessuna'}</span>
              </div>
              {selectedItem.Descrizione && (
                <div className="py-2 border-b border-outline-variant">
                  <span className="text-on-surface-variant">Description</span>
                  <div className="mt-1">{selectedItem.Descrizione}</div>
                </div>
              )}
              {selectedItem.Clienti && (
                <div className="py-2 border-b border-outline-variant">
                  <span className="text-on-surface-variant">Clients</span>
                  <div className="mt-1">{selectedItem.Clienti}</div>
                </div>
              )}
              {selectedItem.Targa && (
                <div className="flex justify-between py-2 border-b border-outline-variant">
                  <span className="text-on-surface-variant">Targa</span>
                  <span>{selectedItem.Targa}</span>
                </div>
              )}
              {selectedItem.Note && (
                <div className="py-2 border-b border-outline-variant">
                  <span className="text-on-surface-variant">Notes</span>
                  <div className="mt-1 whitespace-pre-wrap">{selectedItem.Note}</div>
                </div>
              )}

              <div className="mt-4 mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Metadata</div>
              <div className="flex justify-between py-2 border-b border-outline-variant">
                <span className="text-on-surface-variant">Token</span>
                <span className="font-mono text-xs">{selectedItem.Token}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-on-surface-variant">Submitted At</span>
                <span>{formatDateTime(selectedItem.SubmittedAt)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
