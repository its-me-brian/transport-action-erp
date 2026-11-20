import React, { useState } from 'react';
import { Inbox, Eye, Filter, CheckSquare, Loader2 } from 'lucide-react';
import InboxNormalizeModal from './InboxNormalizeModal';
import InboxDetailsModal from './InboxDetailsModal';
import { useAuth } from '../contexts/AuthContext';
import { useReportInbox, InboxItem } from '../hooks/useReportInbox';
import { useOpenService } from '../hooks/useOpenService';
import { useToast } from '../contexts/ToastContext';
import { bulkAcceptInbox } from '../services/api';
import { Skeleton } from './ui/Skeleton';

interface InboxItemRowProps {
  item: InboxItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  getSourceBadge: (source: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  driverName: (id: string, item?: InboxItem) => string;
  formatDisplayDate: (date: string) => string;
  getServiceId: (item: InboxItem) => string;
  openService: (serviceId: string) => void;
  handleSelectItem: (item: InboxItem) => void;
}

const InboxItemRow = React.memo(function InboxItemRow({ item, isSelected, onToggleSelect, getSourceBadge, getStatusBadge, driverName, formatDisplayDate, getServiceId, openService, handleSelectItem }: InboxItemRowProps) {
  const svcId = getServiceId(item);
  return (
    <tr key={item.ID} className={`hover:bg-surface-container-low transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-outline-variant"
        />
      </td>
      <td className="px-4 py-3">{getSourceBadge(item.Source)}</td>
      <td className="px-4 py-3 text-sm font-medium">{driverName(item.DriverID, item)}</td>
      <td className="px-4 py-3 text-sm">
        {svcId ? (
          <button
            onClick={() => openService(svcId)}
            className="text-primary hover:underline cursor-pointer font-medium"
            aria-label={`Open service ${svcId}`}
          >
            {svcId}
          </button>
        ) : (
          <span className="text-on-surface-variant/50">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">{formatDisplayDate(item.ServiceDate)}</td>
      <td className="px-4 py-3">{getStatusBadge(item.Status)}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => handleSelectItem(item)}
          className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
          title="View details"
          aria-label="View details"
        >
          <Eye className="w-4 h-4 text-on-surface-variant" />
        </button>
      </td>
    </tr>
  );
});

interface ReportInboxScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ReportInboxScreen({ onNavigate }: ReportInboxScreenProps) {
  const { can } = useAuth();
  const openService = useOpenService();
  const { showToast } = useToast();
  const {
    items, isLoading, selectedItem, normForm, matchingServices, isSearchingServices,
    filterSource, filterStatus, filterDriver,
    rejectReason, isSaving,
    filteredItems, stats, isNormalizable, isReviewable, isPendingReview,
    setSelectedItem, setRejectReason, setNormForm,
    setFilterSource, setFilterStatus, setFilterDriver,
    handleSelectItem, handleNormalize, handleQuickApprove,
    handleSubmitToReview, handleAccept, handleReject, handleLock,
    driverName, projectName, formatDisplayDate, getFieldDiff, getRawData,
    loadItems,
  } = useReportInbox({ onNavigate });

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.ID)));
    }
  };

  const handleBulkAccept = async () => {
    const ids = Array.from(selectedIds);
    const pendingItems = filteredItems.filter(i => ids.includes(i.ID) && i.Status === 'ACCEPTED');
    if (pendingItems.length === 0) {
      showToast('No ACCEPTED items selected for bulk accept', 'warning');
      return;
    }
    setIsBulkProcessing(true);
    try {
      const result = await bulkAcceptInbox(pendingItems.map(i => i.ID));
      showToast(`Bulk accept: ${result.accepted || 0} accepted, ${result.failed || 0} failed`, result.failed ? 'warning' : 'success');
      setSelectedIds(new Set());
      loadItems();
    } catch (err) {
      showToast(`Bulk accept failed: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Captured</span>;
      case 'NORMALIZED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Normalized</span>;
      case 'PENDING_REVIEW': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'ACCEPTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Accepted</span>;
      case 'REJECTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      case 'LOCKED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Locked</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{status}</span>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'whatsapp': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">WhatsApp</span>;
      case 'driverlink': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Driver Link</span>;
      case 'backoffice': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Backoffice</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{source}</span>;
    }
  };

  const getServiceId = (item: InboxItem): string => {
    try {
      const raw = JSON.parse(item.RawData || '{}');
      return raw.serviceId || '';
    } catch { return ''; }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-hidden pb-24">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Report Inbox</h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">Unified capture layer for driver reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-on-surface">{stats.total}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Total</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-blue-600">{stats.captured}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Captured</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-yellow-600">{stats.pendingReview}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Pending Review</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-green-600">{stats.accepted}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Accepted</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-red-600">{stats.rejected}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            aria-label="Filter by source"
            className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="driverlink">Driver Link</option>
            <option value="backoffice">Backoffice</option>
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none cursor-pointer shrink-0"
        >
          <option value="">All Status</option>
          <option value="CAPTURED">Captured</option>
          <option value="NORMALIZED">Normalized</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="LOCKED">Locked</option>
        </select>
        <input
          type="text"
          placeholder="Filter by Driver..."
          aria-label="Filter by Driver"
          value={filterDriver}
          onChange={e => setFilterDriver(e.target.value)}
          className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none shrink-0 w-full sm:w-auto"
        />
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden" role="status">
          <span className="sr-only">Loading...</span>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Service</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-7 w-7 rounded ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No inbox items found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          {/* Bulk Actions Toolbar */}
          {selectedIds.size > 0 && (
            <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-3">
              <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
              {can('inbox.review') && (
                <button
                  onClick={handleBulkAccept}
                  disabled={isBulkProcessing}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  {isBulkProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
                  Accept Selected
                </button>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-outline-variant"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Service</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredItems.map(item => {
                return (
                  <InboxItemRow
                    key={item.ID}
                    item={item}
                    isSelected={selectedIds.has(item.ID)}
                    onToggleSelect={() => toggleSelectItem(item.ID)}
                    getSourceBadge={getSourceBadge}
                    getStatusBadge={getStatusBadge}
                    driverName={driverName}
                    formatDisplayDate={formatDisplayDate}
                    getServiceId={getServiceId}
                    openService={openService}
                    handleSelectItem={handleSelectItem}
                  />
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Normalize Modal — CAPTURED */}
      {selectedItem && isNormalizable && (
        <InboxNormalizeModal
          item={selectedItem}
          normForm={normForm}
          onNormFormChange={setNormForm}
          serviceRef={null}
          matchingServices={matchingServices}
          isSearchingServices={isSearchingServices}
          onClose={() => setSelectedItem(null)}
          onQuickApprove={handleQuickApprove}
          onNormalize={handleNormalize}
          isSaving={isSaving}
          canNormalize={!!can('inbox.normalize')}
          driverName={driverName}
          projectName={projectName}
          formatDisplayDate={formatDisplayDate}
          getFieldDiff={getFieldDiff}
          getRawData={getRawData}
        />
      )}

      {/* Details Modal — NORMALIZED / PENDING_REVIEW / etc */}
      {selectedItem && !isNormalizable && (
        <InboxDetailsModal
          item={selectedItem}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          onClose={() => setSelectedItem(null)}
          onSubmitToReview={handleSubmitToReview}
          onAccept={handleAccept}
          onReject={handleReject}
          onLock={handleLock}
          isSaving={isSaving}
          isReviewable={isReviewable}
          isPendingReview={isPendingReview}
          canReview={!!can('inbox.review')}
          driverName={driverName}
          projectName={projectName}
          formatDisplayDate={formatDisplayDate}
        />
      )}
    </div>
  );
}
