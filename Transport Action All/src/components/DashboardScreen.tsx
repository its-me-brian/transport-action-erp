import React from 'react';
import { Service, ScreenId, ViewMode } from '../types';
import { useDashboard } from '../hooks/useDashboard';
import EditServiceModal from './EditServiceModal';
import DeleteCancelModal from './DeleteCancelModal';
import AdjustmentModal from './AdjustmentModal';
import BulkActionsToolbar from './BulkActionsToolbar';
import BulkAssignDriverModal from './BulkAssignDriverModal';
import DashboardHeader from './DashboardHeader';
import DayDetailView from './DayDetailView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import { LoadingSkeleton } from './DashboardPlaceholders';

interface DashboardScreenProps {
  services: Service[];
  isLoading: boolean;
  baseDate: Date;
  onBaseDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
}

export default function DashboardScreen({
  services, isLoading, baseDate, onBaseDateChange, viewMode, onViewModeChange, onNavigate, onServiceUpdate
}: DashboardScreenProps) {
  const {
    activeEntity, setActiveEntity,
    companies, vehicleTypes,
    searchQuery, setSearchQuery,
    selectedDay, setSelectedDay,
    editingService, setEditingService,
    deleteCancelService, setDeleteCancelService,
    deleteCancelMode, setDeleteCancelMode,
    adjustingService, setAdjustingService,
    adjustmentType, setAdjustmentType,
    selectedServiceIds,
    isBulkCompleting,
    openService,
    expandedCards,
    dbDrivers,
    parametros,
    driverFilter, setDriverFilter,
    statusFilter, setStatusFilter,
    showBulkDriverPicker, setShowBulkDriverPicker,
    bulkAssignDriverId, setBulkAssignDriverId,
    lastTapMapRef,
    driverOptions,
    statusOptions,
    filteredServices,
    columns,
    completedDates,
    dateRangeLabel,
    effectiveDay,
    dayServices,
    layoutServices,
    toggleServiceSelection,
    clearSelection,
    handleBulkWorkflow,
    handleBulkAssignDriver,
    selectAllServicesForDay,
    handleWorkflowAction,
    handleDoubleClick,
    handleCloseEdit,
    handleOpenCancel,
    handleOpenDelete,
    handleDeleteCancelConfirm,
    handleOpenAdjustment,
    handleAdjustmentConfirm,
    toggleExpandedCard,
  } = useDashboard({ services, isLoading, baseDate, onBaseDateChange, viewMode, onViewModeChange, onNavigate, onServiceUpdate });

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <DashboardHeader
        viewMode={viewMode}
        baseDate={baseDate}
        onBaseDateChange={onBaseDateChange}
        onViewModeChange={(mode) => { onViewModeChange(mode); setSelectedDay(null); }}
        onNavigate={onNavigate}
        dateRangeLabel={dateRangeLabel}
        companies={companies}
        driverOptions={driverOptions}
        statusOptions={statusOptions}
        activeEntity={activeEntity}
        driverFilter={driverFilter}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        onEntityChange={setActiveEntity}
        onDriverFilterChange={setDriverFilter}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? <LoadingSkeleton /> : (
          <>
            {viewMode === 'month' && (
              <MonthView
                baseDate={baseDate}
                filteredServices={filteredServices}
                completedDates={completedDates}
                onBaseDateChange={onBaseDateChange}
                onViewModeChange={onViewModeChange}
              />
            )}
            {viewMode === 'week' && selectedDay && (
              <DayDetailView
                effectiveDay={effectiveDay}
                selectedDay={selectedDay}
                dayServices={dayServices}
                layoutServices={layoutServices}
                selectedServiceIds={selectedServiceIds}
                toggleServiceSelection={toggleServiceSelection}
                selectAllServicesForDay={selectAllServicesForDay}
                setSelectedDay={setSelectedDay}
                handleDoubleClick={handleDoubleClick}
                openService={openService}
                lastTapMapRef={lastTapMapRef}
              />
            )}
            {viewMode === 'week' && !selectedDay && (
              <WeekView
                columns={columns}
                filteredServices={filteredServices}
                completedDates={completedDates}
                selectedServiceIds={selectedServiceIds}
                handleDoubleClick={handleDoubleClick}
                toggleServiceSelection={toggleServiceSelection}
                openService={openService}
              />
            )}
            {viewMode === 'day' && (
              <DayDetailView
                effectiveDay={effectiveDay}
                selectedDay={selectedDay}
                dayServices={dayServices}
                layoutServices={layoutServices}
                selectedServiceIds={selectedServiceIds}
                toggleServiceSelection={toggleServiceSelection}
                selectAllServicesForDay={selectAllServicesForDay}
                setSelectedDay={setSelectedDay}
                handleDoubleClick={handleDoubleClick}
                openService={openService}
                lastTapMapRef={lastTapMapRef}
              />
            )}
          </>
        )}
      </div>

      <EditServiceModal
        service={editingService}
        onClose={handleCloseEdit}
        onSave={onServiceUpdate || (() => {})}
        onDelete={handleOpenCancel}
        dbDrivers={dbDrivers}
        vehicleTypes={vehicleTypes}
        parametros={parametros}
      />

      <DeleteCancelModal
        service={deleteCancelService}
        mode={deleteCancelMode}
        onClose={() => setDeleteCancelService(null)}
        onConfirm={handleDeleteCancelConfirm}
      />

      <AdjustmentModal
        service={adjustingService}
        type={adjustmentType}
        onClose={() => setAdjustingService(null)}
        onConfirm={handleAdjustmentConfirm}
      />

      <BulkActionsToolbar
        selectedServiceIds={selectedServiceIds}
        services={services}
        onClearSelection={clearSelection}
        onBulkWorkflow={handleBulkWorkflow}
        onOpenBulkAssignDriver={() => setShowBulkDriverPicker(true)}
        isBulkCompleting={isBulkCompleting}
      />

      <BulkAssignDriverModal
        show={showBulkDriverPicker}
        onClose={() => setShowBulkDriverPicker(false)}
        selectedCount={selectedServiceIds.size}
        drivers={dbDrivers}
        bulkAssignDriverId={bulkAssignDriverId}
        onAssignDriverChange={setBulkAssignDriverId}
        onAssign={handleBulkAssignDriver}
        isAssigning={isBulkCompleting}
      />
    </div>
  );
}
