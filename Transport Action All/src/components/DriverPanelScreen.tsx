import React from 'react';
import { Users, Search, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Driver, ScreenId, getDriverAvatar } from '../types';
import useDriverPanel, { SortField } from '../hooks/useDriverPanel';
import DriverCard from './DriverCard';
import DriverEditModal from './DriverEditModal';
import DriverAddModal from './DriverAddModal';
import DriverDeleteConfirm from './DriverDeleteConfirm';
import SupplierRatesModal from './SupplierRatesModal';

interface DriverPanelScreenProps {
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function DriverPanelScreen({ drivers: propDrivers, onNavigate }: DriverPanelScreenProps) {
  const {
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    isLoading,
    sortField, sortDir,
    editDriver, setEditDriver, editSaving,
    collaborators,
    showAddModal, setShowAddModal,
    newDriver, setNewDriver, addSaving,
    deleteConfirm, setDeleteConfirm,
    showRatesModal, driverRates, loadingRates,
    editRate, setEditRate, isNewRate, setIsNewRate,
    vehicleTypes, serviceTypes,
    allDrivers, filteredDrivers,
    toggleSort, handleCleanup,
    saveEdit, loadDriverRates, handleSaveRate, handleDeleteRate,
    saveNewDriver, handleDelete, findDbRecord,
    handleEditDriver, handleWhatsApp,
    openRatesModal, closeRatesModal,
    deleteConfirmDriverName,
  } = useDriverPanel({ drivers: propDrivers, onNavigate });

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors cursor-pointer ${
        sortField === field ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  return (
    <div id="driver-management-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      
      {/* Top Header/Action Bar */}
      <header id="driver-header-actions" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Driver Management</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            id="driver-panel-import-btn"
            onClick={() => onNavigate('transport_list', 'push')}
            className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          
          <button 
            id="driver-panel-add-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Driver</span>
          </button>
        </div>
      </header>

      {/* Filter, Search, and Sort Bar */}
      <div id="driver-filters-bar" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              data-driver-search="true"
              placeholder="Search drivers, vehicles..." 
              aria-label="Search drivers, vehicles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Disponible' | 'Asignado' | 'Inactivo')}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide mr-1">Sort:</span>
          <SortButton field="name" label="Name" />
          <SortButton field="status" label="Status" />
          <SortButton field="vehicle" label="Vehicle" />
          <SortButton field="lastUsed" label="Last Used" />
          <button
            onClick={handleCleanup}
            className="ml-auto text-[10px] text-on-surface-variant hover:text-red-500 cursor-pointer underline"
          >
            Clean junk entries
          </button>
        </div>
      </div>

      {/* Driver Grid Deck */}
      <div id="drivers-deck" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-surface-container-highest rounded w-28 animate-pulse" />
                      <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                  <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
              </div>
            ))}
          </>
        ) : filteredDrivers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Users className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No drivers match your search' : 'No drivers in database. Import a Transport List to populate.'}
            </span>
          </div>
        ) : filteredDrivers.map((dr) => {
          const dbRec = findDbRecord(dr.id);
          return (
            <DriverCard
              key={dr.id}
              driver={dr}
              dbRec={dbRec}
              onEdit={(driver, dbRec) => {
                setEditDriver({
                  id: driver.id,
                  name: driver.name,
                  phone: dbRec?.phone || '',
                  whatsapp: dbRec?.whatsapp || '',
                  vehiclePreferred: dbRec?.vehiclePreferred || driver.vehicle,
                  notes: dbRec?.notes || '',
                  status: driver.status || 'Disponible',
                  type: dbRec?.type || 'interno',
                  collaboratorId: dbRec?.collaboratorId || '',
                  driverOwnership: dbRec?.driverOwnership || 'own',
                  email: dbRec?.email || '',
                  iban: dbRec?.iban || '',
                  licenseType: dbRec?.licenseType || '',
                  licenseExpiry: dbRec?.licenseExpiry || '',
                  operatingCompany: dbRec?.operatingCompany || '',
                  lastImportDate: dbRec?.lastImportDate || '',
                });
              }}
              onDelete={(id) => setDeleteConfirm(id)}
              onWhatsApp={(phone) => {
                const clean = phone.replace(/[^0-9+]/g, '');
                if (clean) window.open(`https://wa.me/${clean.replace(/^\+/, '')}`, '_blank');
              }}
            />
          );
        })}
      </div>

      {/* Modals */}
      {editDriver && (
        <DriverEditModal
          driver={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={saveEdit}
          saving={editSaving}
          collaborators={collaborators}
          onOpenRates={() => { openRatesModal(editDriver); loadDriverRates(editDriver.id); }}
          onChange={(d) => setEditDriver(d)}
        />
      )}

      {showAddModal && (
        <DriverAddModal
          onClose={() => setShowAddModal(false)}
          onSave={saveNewDriver}
          saving={addSaving}
          newDriver={newDriver}
          onChange={setNewDriver}
        />
      )}

      {deleteConfirm && (
        <DriverDeleteConfirm
          driverName={deleteConfirmDriverName}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}

      {showRatesModal && (
        <SupplierRatesModal
          driverName={showRatesModal.name}
          onClose={closeRatesModal}
          loading={loadingRates}
          rates={driverRates}
          editRate={editRate}
          isNewRate={isNewRate}
          onEditRate={(r) => setEditRate(r)}
          onSetIsNewRate={setIsNewRate}
          onSaveRate={handleSaveRate}
          onDeleteRate={handleDeleteRate}
          onCancelEdit={() => setEditRate(null)}
          serviceTypes={serviceTypes}
          vehicleTypes={vehicleTypes}
        />
      )}
    </div>
  );
}
