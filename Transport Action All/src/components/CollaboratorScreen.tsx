import React from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2
} from 'lucide-react';
import { ScreenId } from '../types';
import { useCollaborators } from '../hooks/useCollaborators';
import { CollaboratorFormModal, RatesModal } from './CollaboratorModals';

interface CollaboratorScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

const CollaboratorCardItem = React.memo(function CollaboratorCardItem({ c, onOpenRates, onEdit, deleteConfirm, onDelete, onDeleteConfirmSet }: {
  c: any;
  onOpenRates: (c: any) => void;
  onEdit: (c: any) => void;
  deleteConfirm: string | null;
  onDelete: (id: string) => void;
  onDeleteConfirmSet: (id: string | null) => void;
}) {
  return (
    <div
      key={c.id}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-on-surface">{c.name}</span>
          {c.vat && <span className="text-[10px] text-on-surface-variant font-mono">VAT: {c.vat}</span>}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {c.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          {c.phone && <span>{c.phone}</span>}
          {c.email && <span>{c.email}</span>}
          {c.operatingCompany && <span>{c.operatingCompany}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onOpenRates(c)}
          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors cursor-pointer"
        >
          Rates
        </button>
        <button
          onClick={() => onEdit(c)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {deleteConfirm === c.id ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete(c.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded hover:bg-red-600 cursor-pointer">Yes</button>
            <button onClick={() => onDeleteConfirmSet(null)} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer">No</button>
          </div>
        ) : (
          <button onClick={() => onDeleteConfirmSet(c.id)} className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

export default function CollaboratorScreen({ onNavigate }: CollaboratorScreenProps) {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    editCollaborator,
    setEditCollaborator,
    isSaving,
    isNew,
    setIsNew,
    selectedCollaborator,
    setSelectedCollaborator,
    rates,
    loadingRates,
    editRate,
    setEditRate,
    isNewRate,
    setIsNewRate,
    deleteConfirm,
    setDeleteConfirm,
    vehicleTypes,
    serviceTypes,
    linkedDrivers,
    allDrivers,
    loadingDrivers,
    filtered,
    handleSave,
    handleDelete,
    handleOpenRates,
    handleSaveRate,
    handleDeleteRate,
    handleLinkDriver,
    handleUnlinkDriver,
    loadLinkedDrivers,
    setLinkedDrivers,
    formatCurrency
  } = useCollaborators();

  return (
    <div id="collaborator-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <header id="collaborator-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Providers</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} collaborator{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCollaborator({ name: '', vat: '', address: '', phone: '', email: '', paymentTerms: 30, notes: '', operatingCompany: '', active: true }); setIsNew(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Provider</span>
        </button>
      </header>

      {/* Filters */}
      <div id="collaborator-filters" className="px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search providers..."
            aria-label="Search providers"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
      </div>

      {/* Collaborators List */}
      <div id="collaborators-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-16 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-12 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-6 bg-surface-container-highest rounded w-12 animate-pulse" />
                  <div className="h-6 bg-surface-container-highest rounded w-6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Users className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No providers match your search' : 'No providers yet'}
            </span>
          </div>
        ) : (
          filtered.map(c => (
            <CollaboratorCardItem
              key={c.id}
              c={c}
              onOpenRates={handleOpenRates}
              onEdit={(c) => { setEditCollaborator(c); setIsNew(false); loadLinkedDrivers(c.id); }}
              deleteConfirm={deleteConfirm}
              onDelete={handleDelete}
              onDeleteConfirmSet={setDeleteConfirm}
            />
          ))
        )}
      </div>

      <CollaboratorFormModal
        editCollaborator={editCollaborator}
        setEditCollaborator={setEditCollaborator}
        isNew={isNew}
        isSaving={isSaving}
        linkedDrivers={linkedDrivers}
        allDrivers={allDrivers}
        loadingDrivers={loadingDrivers}
        handleSave={handleSave}
        handleLinkDriver={handleLinkDriver}
        handleUnlinkDriver={handleUnlinkDriver}
        serviceTypes={serviceTypes}
        setLinkedDrivers={setLinkedDrivers}
      />

      <RatesModal
        selectedCollaborator={selectedCollaborator}
        setSelectedCollaborator={setSelectedCollaborator}
        rates={rates}
        loadingRates={loadingRates}
        editRate={editRate}
        setEditRate={setEditRate}
        isNewRate={isNewRate}
        setIsNewRate={setIsNewRate}
        isSaving={isSaving}
        vehicleTypes={vehicleTypes}
        serviceTypes={serviceTypes}
        handleSaveRate={handleSaveRate}
        handleDeleteRate={handleDeleteRate}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
