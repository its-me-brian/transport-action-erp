import React from 'react';
import { Inbox, Eye, Filter } from 'lucide-react';
import InboxNormalizeModal from './InboxNormalizeModal';
import InboxDetailsModal from './InboxDetailsModal';
import { useAuth } from '../contexts/AuthContext';
import { useReportInbox, InboxItem } from '../hooks/useReportInbox';

interface ReportInboxScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ReportInboxScreen({ onNavigate }: ReportInboxScreenProps) {
  const { can } = useAuth();
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-hidden">
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
          value={filterDriver}
          onChange={e => setFilterDriver(e.target.value)}
          className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none shrink-0 w-full sm:w-auto"
        />
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Correlation</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-surface-dim rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-20 bg-surface-dim rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-7 w-7 bg-surface-dim rounded ml-auto" /></td>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Correlation</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredItems.map(item => (
                <tr key={item.ID} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3">{getSourceBadge(item.Source)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{driverName(item.DriverID, item)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{projectName(item.ProjectID, item)}</td>
                  <td className="px-4 py-3 text-sm">{formatDisplayDate(item.ServiceDate)}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.Status)}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{item.CorrelationID?.substring(0, 12)}...</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSelectItem(item)}
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
