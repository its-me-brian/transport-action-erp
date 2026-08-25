import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, Download } from 'lucide-react';
import { ScreenId } from '../types';
import { useRapportino } from '../hooks/useRapportino';
import {
  ClientRapportinoCard, DriverRapportinoCard, CollaboratorRapportinoCard,
  CLIENT_NEXT_STATUS_LABELS, DRIVER_NEXT_STATUS_LABELS, COLLABORATOR_NEXT_STATUS_LABELS,
  ClientStatus, DriverStatus, CollaboratorStatus
} from './RapportinoCards';
import RapportinoFilterBar from './RapportinoFilterBar';
import RapportinoDetailModal from './RapportinoDetailModal';
import DriverLinkModal from './DriverLinkModal';

interface RapportinoScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function RapportinoScreen({ onNavigate }: RapportinoScreenProps) {
  const {
    activeTab, setActiveTab,
    clientRapportinos, driverRapportinos, collaboratorRapportinos,
    isLoading,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    filterClient, setFilterClient,
    filterDriver, setFilterDriver,
    filterCollaborator, setFilterCollaborator,
    filterProject, setFilterProject,
    clientsList, driversList, collaboratorsList, projectsList,
    viewTarget, setViewTarget,
    updatingStatus,
    driverLinkModal, setDriverLinkModal,
    filteredClients, filteredDrivers, filteredCollaborators,
    currentStatuses, currentData,
    handleClientStatusUpdate, handleDriverStatusUpdate, handleCollaboratorStatusUpdate,
    getClientNextAction, getDriverNextAction, getCollaboratorNextAction,
    handleGenerateDriverLink, handleCopyLink,
    formatCurrency, formatDate,
    handleExportExcel, handleExportPDF,
    handleClearFilters,
    onNavigate: nav,
  } = useRapportino({ onNavigate });

  return (
    <div id="rapportino-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <header id="rapportino-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Rapportinos</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {currentData.length} rapportino{currentData.length !== 1 ? 's' : ''} · {activeTab === 'client' ? 'Clienti' : activeTab === 'driver' ? 'Conductores' : 'Collaboratori'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => nav('reports')}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generar desde Reportes</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-dim rounded-lg p-1 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => { setActiveTab('client'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'client'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Clienti ({clientRapportinos.length})
        </button>
        <button
          onClick={() => { setActiveTab('driver'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'driver'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Conductores ({driverRapportinos.length})
        </button>
        <button
          onClick={() => { setActiveTab('collaborator'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'collaborator'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Collaboratori ({collaboratorRapportinos.length})
        </button>
      </div>

      <RapportinoFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentStatuses={currentStatuses}
        activeTab={activeTab}
        filterClient={filterClient}
        onFilterClientChange={setFilterClient}
        clientsList={clientsList}
        filterDriver={filterDriver}
        onFilterDriverChange={setFilterDriver}
        driversList={driversList}
        filterCollaborator={filterCollaborator}
        onFilterCollaboratorChange={setFilterCollaborator}
        collaboratorsList={collaboratorsList}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projectsList={projectsList}
        onClear={handleClearFilters}
        hasActiveFilters={!!(dateFrom || dateTo || searchQuery || statusFilter !== 'All' || filterClient || filterDriver || filterCollaborator || filterProject)}
      />

      {/* Rapportinos List */}
      <div id="rapportinos-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-dim rounded w-1/3" />
                  <div className="h-3 bg-surface-dim rounded w-1/2" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-surface-dim rounded-full" />
                  <div className="h-8 w-8 bg-surface-dim rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <FileText className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery || statusFilter !== 'All' ? 'No hay rapportinos que coincidan' : 'No hay rapportinos aún'}
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Generar rapportinos desde la pantalla de Reportes
            </p>
          </div>
        ) : activeTab === 'client' ? (
          <AnimatePresence mode="popLayout">
            {filteredClients.map(r => (
            <ClientRapportinoCard
              key={r.id}
              rapportino={r}
              isUpdating={updatingStatus === r.id}
              nextAction={getClientNextAction(r.status as ClientStatus)}
              nextLabel={r.status ? CLIENT_NEXT_STATUS_LABELS[r.status] : null}
              onStatusUpdate={handleClientStatusUpdate}
              onView={(rec) => setViewTarget(rec)}
              formatDate={formatDate}
            />
          ))}
          </AnimatePresence>
        ) : activeTab === 'driver' ? (
          <AnimatePresence mode="popLayout">
            {filteredDrivers.map(r => (
              <DriverRapportinoCard
                key={r.id}
                rapportino={r}
                isUpdating={updatingStatus === r.id}
                nextAction={getDriverNextAction(r.status as DriverStatus)}
                nextLabel={r.status ? DRIVER_NEXT_STATUS_LABELS[r.status] : null}
                linkLoading={driverLinkModal.loading && driverLinkModal.rapportino?.id === r.id}
                onStatusUpdate={handleDriverStatusUpdate}
                onGenerateLink={handleGenerateDriverLink}
                onView={(rec) => setViewTarget(rec)}
                formatDate={formatDate}
              />
            ))}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredCollaborators.map(r => (
              <CollaboratorRapportinoCard
                key={r.id}
                rapportino={r}
                isUpdating={updatingStatus === r.id}
                nextAction={getCollaboratorNextAction(r.status as CollaboratorStatus)}
                nextLabel={r.status ? COLLABORATOR_NEXT_STATUS_LABELS[r.status] : null}
                onStatusUpdate={handleCollaboratorStatusUpdate}
                onView={(rec) => setViewTarget(rec)}
                formatDate={formatDate}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {viewTarget && (
        <RapportinoDetailModal
          viewTarget={viewTarget}
          activeTab={activeTab}
          onClose={() => setViewTarget(null)}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      )}

      <DriverLinkModal
        open={driverLinkModal.open}
        rapportino={driverLinkModal.rapportino}
        loading={driverLinkModal.loading}
        link={driverLinkModal.link}
        error={driverLinkModal.error}
        copied={driverLinkModal.copied}
        onClose={() => setDriverLinkModal({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false })}
        onCopyLink={handleCopyLink}
        formatDate={formatDate}
      />
    </div>
  );
}
