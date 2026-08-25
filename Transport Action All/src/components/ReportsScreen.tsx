import React from 'react';
import { Service, Driver, ScreenId } from '../types';
import useReports from '../hooks/useReports';
import { STATUS_CONFIG } from '../utils/reportHelpers';
import WhatsAppParserSection from './WhatsAppParserSection';
import RapportinoGeneratorForm from './RapportinoGeneratorForm';
import GeneratedRapportinosList from './GeneratedRapportinosList';
import QuickStatsSection from './QuickStatsSection';

interface ReportsScreenProps {
  services: Service[];
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
}

export default function ReportsScreen({ services, drivers, onNavigate, onServiceUpdate }: ReportsScreenProps) {
  const {
    rapportinoType, setRapportinoType,
    periodType, setPeriodType,
    selectedProduction, setSelectedProduction,
    selectedDriver, setSelectedDriver,
    selectedCollaborator, setSelectedCollaborator,
    collaboratorsList,
    driverSearchQuery, setDriverSearchQuery,
    showDriverDropdown, setShowDriverDropdown,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    isGenerating,
    generatedList,
    generationError,
    statusFilter, setStatusFilter,
    whatsappText, setWhatsappText,
    parsedReports,
    showWhatsAppSection, setShowWhatsAppSection,
    matchedServices,
    applyingReport,
    selectedServiceIds,
    rapportinoName, setRapportinoName,
    productions,
    driverNames,
    filteredServices,
    filteredGeneratedList,
    totalCost,
    statusCounts,
    totalHours,
    handleGenerate,
    handleAdvanceStatus,
    handleParseWhatsApp,
    handleApplyToService,
    toggleServiceSelection,
    toggleSelectAll,
    getSelectedServices,
    calcBackendCosts,
    buildServiceDescription,
  } = useReports({ services, drivers, onServiceUpdate });

  return (
    <div id="reports-screen" className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div id="reports-header" className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Rapportino</h1>
          <p className="text-[13px] text-on-surface-variant">Generate cost breakdown reports for productions and drivers.</p>
        </div>
      </div>

      <WhatsAppParserSection
        whatsappText={whatsappText}
        onWhatsappTextChange={setWhatsappText}
        parsedReports={parsedReports}
        showSection={showWhatsAppSection}
        onToggleSection={setShowWhatsAppSection}
        matchedServices={matchedServices}
        onParse={handleParseWhatsApp}
        onApplyToService={handleApplyToService}
        applyingReport={applyingReport}
      />

      <RapportinoGeneratorForm
        rapportinoType={rapportinoType}
        onRapportinoTypeChange={setRapportinoType}
        selectedProduction={selectedProduction}
        onSelectedProductionChange={setSelectedProduction}
        selectedDriver={selectedDriver}
        onSelectedDriverChange={setSelectedDriver}
        selectedCollaborator={selectedCollaborator}
        onSelectedCollaboratorChange={setSelectedCollaborator}
        collaboratorsList={collaboratorsList}
        driverSearchQuery={driverSearchQuery}
        onDriverSearchQueryChange={setDriverSearchQuery}
        showDriverDropdown={showDriverDropdown}
        onShowDriverDropdownChange={setShowDriverDropdown}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        rapportinoName={rapportinoName}
        onRapportinoNameChange={setRapportinoName}
        filteredServices={filteredServices}
        getSelectedServices={getSelectedServices}
        selectedServiceIds={selectedServiceIds}
        onToggleServiceSelection={toggleServiceSelection}
        onToggleSelectAll={toggleSelectAll}
        isGenerating={isGenerating}
        generationError={generationError}
        onGenerate={handleGenerate}
        calcBackendCosts={calcBackendCosts}
        buildServiceDescription={buildServiceDescription}
        productions={productions}
        driverNames={driverNames}
      />

      {/* Status Filter Tabs */}
      {generatedList.length > 0 && (
        <section id="status-filter-tabs" className="flex flex-wrap gap-2">
          {(['All', 'Borrador', 'Revisado', 'Enviado', 'Pagado'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              {status !== 'All' && STATUS_CONFIG[status].icon}
              {status}
              <span className="ml-1 text-[10px] opacity-70">({statusCounts[status] || 0})</span>
            </button>
          ))}
        </section>
      )}

      <GeneratedRapportinosList
        filteredGeneratedList={filteredGeneratedList}
        STATUS_CONFIG={STATUS_CONFIG}
        onAdvanceStatus={handleAdvanceStatus}
      />

      <QuickStatsSection
        totalHours={totalHours}
        services={services}
        generatedListCount={generatedList.length}
      />
    </div>
  );
}
