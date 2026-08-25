import React from 'react';
import {
  Upload,
  CheckCircle,
  X,
  Check,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { ScreenId } from '../types';
import { PrintPreview } from './print';
import DriverCell from './DriverCell';
import ServiceTableRows from './ServiceTableRows';
import MobileServiceCard from './MobileServiceCard';
import TransportListEmailModal from './TransportListEmailModal';
import TransportListAgencyModal from './TransportListAgencyModal';
import TransportListImportModal from './TransportListImportModal';
import TransportListExportResultModal from './TransportListExportResultModal';
import TransportListSavePromptModal from './TransportListSavePromptModal';
import TransportListFilterBar from './TransportListFilterBar';
import TransportListDesktopActions from './TransportListDesktopActions';
import TransportListMobileMoreMenu from './TransportListMobileMoreMenu';
import TransportListHistoryTable from './TransportListHistoryTable';
import TransportListParserDebugPanel from './TransportListParserDebugPanel';
import useTransportList from '../hooks/useTransportList';

interface TransportListScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onImportComplete?: () => void;
}

export default function TransportListScreen({ onNavigate, onImportComplete }: TransportListScreenProps) {
  const h = useTransportList({ onImportComplete });

  return (
    <div id="transport-list-screen" className="flex-1 w-full flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center w-full px-3 md:px-6 py-3 max-w-[1400px] mx-auto border-b border-outline-variant bg-background/90 backdrop-blur-md sticky top-0 z-30">
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface truncate">
            {h.step === 'upload' && 'Import Transport List'}
            {h.step === 'preview' && 'Preview & Edit'}
            {h.step === 'syncing' && 'Syncing...'}
            {h.step === 'done' && 'Import Complete'}
          </h2>
          <p className="text-on-surface-variant text-[11px] md:text-[12px] mt-0.5 truncate">
            {h.step === 'upload' && 'Subí el Excel de la transport list para parsear y previsualizar.'}
            {h.step === 'preview' && `${h.services.length} servicios · ${h.selectedRows.size} seleccionados`}
            {h.step === 'syncing' && 'Guardando en el Sheet...'}
            {h.step === 'done' && 'Servicios registrados exitosamente'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {h.step === 'preview' && (
            <button 
              onClick={h.clearFile}
              className="hidden md:flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[12px] font-medium px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-lowest"
            >
              <X className="w-3.5 h-3.5" />
              <span>New Import</span>
            </button>
          )}
          <button 
            onClick={() => onNavigate('transport', 'push_back')}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[12px] font-medium px-2.5 md:px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-lowest"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-[1400px] mx-auto w-full space-y-4 flex-1">
        
        {/* Error alert */}
        {h.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] text-red-700 font-medium">{h.error}</p>
            </div>
            <button onClick={() => h.setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP: Upload */}
        {h.step === 'upload' && (
          <div 
            onDragOver={h.handleDragOver}
            onDragLeave={h.handleDragLeave}
            onDrop={h.handleDrop}
            className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer transition-colors ${
              h.dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-dim hover:border-primary'
            }`}
          >
            <input 
              ref={h.fileInputRef}
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls"
              onChange={h.handleFileSelect}
            />

            {!h.selectedFile ? (
              <label className="flex flex-col items-center cursor-pointer w-full" onClick={() => h.fileInputRef.current?.click()}>
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-[14px] font-semibold text-on-surface">Drag & Drop Excel</h3>
                <p className="text-on-surface-variant text-[12px] mt-1 mb-3">.xlsx files only</p>
                <span className="bg-surface-container-lowest text-primary border border-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors">
                  Browse Files
                </span>
              </label>
            ) : (
              <div className="flex flex-col items-center w-full max-w-xs">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  h.uploadProgress === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary animate-pulse'
                }`}>
                  {h.uploadProgress === 100 ? <Check className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                </div>
                
                <h4 className="font-medium text-[13px] text-on-surface truncate max-w-xs">{h.selectedFile.name}</h4>
                <p className="text-on-surface-variant text-[11px] mt-0.5">{(h.selectedFile.size / 1024).toFixed(1)} KB</p>

                {h.uploadProgress !== null && (
                  <div className="w-full bg-surface-container rounded-full h-1 mt-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-150 ${h.uploadProgress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                      style={{ width: `${h.uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {h.uploadProgress === 100 ? (
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="text-emerald-600 text-[11px] font-medium">Parsed successfully</span>
                    <button 
                      onClick={h.clearFile}
                      className="text-red-500 hover:text-red-700 text-[11px] font-medium underline cursor-pointer"
                    >
                      Clear and choose another
                    </button>
                  </div>
                ) : (
                  <span className="text-primary text-[11px] font-medium mt-3">Parsing...</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* History — show below upload when on upload step */}
        {h.step === 'upload' && (
          <TransportListHistoryTable
            history={h.history}
            loadingHistory={h.loadingHistory}
            viewingHistory={h.viewingHistory}
            onViewHistory={h.handleViewHistory}
            onClosePreview={() => h.setViewingHistory(null)}
            formatImportDate={h.formatImportDate}
            formatServiceDate={h.formatServiceDate}
          />
        )}

        {/* STEP: Preview & Edit */}
        {(h.step === 'preview' || h.step === 'syncing') && h.services.length > 0 && (
          <>
            {/* Excel-like header — Production | Project Name | Transport Company */}
            <div className="rounded-lg border-2 border-black overflow-hidden">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 font-bold text-[10px] md:text-[12px] text-center uppercase border border-black" style={{ width: '33%' }}>
                      {h.production || 'Production'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 text-center border border-black" style={{ width: '34%' }}>
                      <span className="font-bold italic" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(16px, 4vw, 22px)' }}>
                        {h.projectName || 'Project'}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 font-bold text-[10px] md:text-[12px] text-center uppercase border border-black" style={{ width: '33%' }}>
                      {h.transportCompany || 'Transport Co.'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 text-center text-[11px] md:text-[12px] font-medium border border-black bg-[#e8e8e8]">
                      Prep. Transport List {h.dateStr || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Selection controls + Project selector + Save CTA */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={h.toggleAllSelection}
                  className="text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer"
                >
                  {h.selectedRows.size === h.filteredServices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-on-surface-variant text-[12px]">
                  {h.selectedRows.size} of {h.filteredServices.length}
                </span>

                {/* Project selector */}
                {h.projects.length > 0 && (
                  <select
                    value={h.selectedProjectId}
                    onChange={e => h.setSelectedProjectId(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[11px] font-medium rounded px-2 py-1 focus:border-primary outline-none cursor-pointer"
                    title="Link import to project"
                  >
                    <option value="">No project</option>
                    {h.projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {/* Register / Save to Sheet — primary CTA */}
                <button
                  onClick={h.handleSync}
                  disabled={h.selectedRows.size === 0 || h.step === 'syncing'}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded bg-primary text-on-primary font-semibold hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {h.step === 'syncing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{h.step === 'syncing' ? 'Guardando...' : `Save to Sheet (${h.selectedRows.size})`}</span>
                  <span className="sm:hidden">{h.step === 'syncing' ? '...' : `Save (${h.selectedRows.size})`}</span>
                </button>
              </div>

              {/* Filters bar */}
              <TransportListFilterBar
                filterDateFrom={h.filterDateFrom}
                filterDateTo={h.filterDateTo}
                filterDriver={h.filterDriver}
                filterOperatingCompany={h.filterOperatingCompany}
                filterStatus={h.filterStatus}
                filterProject={h.filterProject}
                filterFinancialStatus={h.filterFinancialStatus}
                services={h.services}
                onDateFromChange={h.setFilterDateFrom}
                onDateToChange={h.setFilterDateTo}
                onDriverChange={h.setFilterDriver}
                onOperatingCompanyChange={h.setFilterOperatingCompany}
                onStatusChange={h.setFilterStatus}
                onProjectChange={h.setFilterProject}
                onFinancialStatusChange={h.setFilterFinancialStatus}
                onClear={h.clearFilterBar}
              />

              {/* Right: Secondary actions — hidden on mobile, shown in overflow menu */}
              <TransportListDesktopActions
                showRoles={h.showRoles}
                viewMode={h.viewMode}
                selectedCount={h.selectedRows.size}
                isExporting={h.isExporting}
                showExportMenu={h.showExportMenu}
                showWhatsAppMenu={h.showWhatsAppMenu}
                services={h.services}
                selectedRows={h.selectedRows}
                onToggleRoles={() => h.setShowRoles(!h.showRoles)}
                onToggleViewMode={h.toggleViewMode}
                onExpandAll={h.expandAllGrouped}
                onCollapseAll={h.collapseAllGrouped}
                onExportPdf={h.handleExportPdf}
                onPrint={() => h.setShowPrintPreview(true)}
                onExportExcel={h.handleExportExcel}
                onToggleExportMenu={() => { h.setShowExportMenu(!h.showExportMenu); h.setShowWhatsAppMenu(false); h.setShowMoreMenu(false); }}
                onToggleWhatsAppMenu={() => { h.setShowWhatsAppMenu(!h.showWhatsAppMenu); h.setShowExportMenu(false); h.setShowMoreMenu(false); }}
                onWhatsAppDriver={h.handleWhatsAppDriver}
                onWhatsAppGroup={h.handleWhatsAppGroup}
                onOpenEmail={() => h.setShowEmailModal(true)}
                onOpenAgency={h.openAgencyModal}
                onRemoveSelected={h.removeSelectedRows}
              />

              {/* Mobile: Overflow "More" menu */}
              <TransportListMobileMoreMenu
                showMoreMenu={h.showMoreMenu}
                showRoles={h.showRoles}
                selectedCount={h.selectedRows.size}
                isExporting={h.isExporting}
                onToggleMenu={() => { h.setShowMoreMenu(!h.showMoreMenu); h.setShowExportMenu(false); h.setShowWhatsAppMenu(false); }}
                onToggleRoles={() => { h.setShowRoles(!h.showRoles); h.setShowMoreMenu(false); }}
                onExportPdf={() => { h.handleExportPdf(); h.setShowMoreMenu(false); }}
                onPrint={() => { h.setShowPrintPreview(true); h.setShowMoreMenu(false); }}
                onExportExcel={() => { h.handleExportExcel(); h.setShowMoreMenu(false); }}
                onWhatsAppGroup={() => { h.handleWhatsAppGroup(); h.setShowMoreMenu(false); }}
                onOpenEmail={() => { h.setShowEmailModal(true); h.setShowMoreMenu(false); }}
                onOpenAgency={() => { h.openAgencyModal(); h.setShowMoreMenu(false); }}
                onRemoveSelected={() => { h.removeSelectedRows(); h.setShowMoreMenu(false); }}
              />
            </div>

            {/* Services — Desktop: table */}
            <ServiceTableRows
              services={h.services}
              filteredServices={h.filteredServices}
              selectedRows={h.selectedRows}
              showRoles={h.showRoles}
              viewMode={h.viewMode}
              expandedServices={h.expandedServices}
              dbDrivers={h.dbDrivers}
              editingCell={h.editingCell}
              editValue={h.editValue}
              lifecycleLoading={h.lifecycleLoading}
              onToggleRowSelection={h.toggleRowSelection}
              onToggleServiceExpand={h.toggleServiceExpand}
              onToggleAllSelection={h.toggleAllSelection}
              onStartEdit={h.startEdit}
              onEditValueChange={h.setEditValue}
              onSaveEdit={h.saveEdit}
              onEditKeyDown={h.handleEditKeyDown}
              onDriverUpdate={h.handleDriverUpdate}
              onVehicleTypeUpdate={h.handleVehicleTypeUpdate}
              onServiceTypeUpdate={h.handleServiceTypeUpdate}
              onOperatingCompanyUpdate={h.handleOperatingCompanyUpdate}
              onLifecycleTransition={h.handleLifecycleTransition}
            />

            {/* Services — Mobile: cards */}
            <div className="md:hidden space-y-2">
              <div className="flex items-center justify-between px-1 py-1">
                <button
                  onClick={h.toggleAllSelection}
                  className="text-[12px] text-primary font-medium cursor-pointer"
                >
                  {h.selectedRows.size === h.filteredServices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-on-surface-variant text-[11px]">{h.selectedRows.size} of {h.filteredServices.length}</span>
              </div>

              {(() => {
                const sectionMap = new Map<string, typeof h.filteredServices>();
                const noSection: typeof h.filteredServices = [];
                for (const svc of h.filteredServices) {
                  const sec = svc.section || '';
                  if (!sec) {
                    noSection.push(svc);
                  } else {
                    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
                    sectionMap.get(sec)!.push(svc);
                  }
                }

                const getSectionStyleMobile = (name: string): string => {
                  const upper = name.toUpperCase();
                  if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) return 'bg-[#7ecfc0]';
                  if (upper === 'PUGLIA') return 'bg-[#a8d8ea]';
                  return 'bg-[#c6d44e]';
                };

                const orderedGroups: { section: string; services: typeof h.services }[] = [];
                for (const [secName, secServices] of sectionMap) {
                  orderedGroups.push({ section: secName, services: secServices });
                }
                if (noSection.length > 0) {
                  orderedGroups.push({ section: '', services: noSection });
                }

                return orderedGroups.map((group) => (
                  <React.Fragment key={group.section || 'nosection'}>
                    {group.section && (
                      <div className={`px-3 py-1.5 rounded-md text-center text-[11px] font-bold ${getSectionStyleMobile(group.section)}`} style={{ border: '1px solid #000' }}>
                        {group.section}
                      </div>
                    )}
                    {group.services.map((service) => (
                      <MobileServiceCard
                        key={service.id}
                        service={service}
                        isSelected={h.selectedRows.has(service.id)}
                        isExpanded={h.expandedServices.has(service.id)}
                        viewMode={h.viewMode}
                        dbDrivers={h.dbDrivers}
                        isServiceCompleted={h.isServiceCompleted}
                        onToggleRowSelection={h.toggleRowSelection}
                        onToggleServiceExpand={h.toggleServiceExpand}
                        onDriverUpdate={h.handleDriverUpdate}
                        onOperatingCompanyUpdate={h.handleOperatingCompanyUpdate}
                      />
                    ))}
                  </React.Fragment>
                ));
              })()}
            </div>

            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 text-[12px] text-on-surface-variant">
              <span>Showing: {h.filteredServices.length} of {h.services.length}</span>
              <span>Drivers: {[...new Set(h.filteredServices.map(s => s.driver).filter(Boolean))].length}</span>
              <span>Vehicles: {[...new Set(h.filteredServices.map(s => s.vehicle).filter(Boolean))].length}</span>
              <span>With phone: {h.filteredServices.filter(s => s.driverPhone).length}</span>
              <span className="text-amber-600">Missing driver: {h.filteredServices.filter(s => !s.driver).length}</span>
            </div>

            {/* Footer contacts — same as Excel footer */}
            {h.footerContacts.length > 0 && (
              <div className="rounded-lg border-2 border-black overflow-hidden">
                <div className="text-center py-1 text-[11px] font-bold" style={{ background: '#7ecfc0', border: '1px solid #000' }}>
                  Arrivals&amp;Departures
                </div>
                <div className="px-4 py-2 text-center" style={{ background: '#e8e8e8' }}>
                  {h.footerContacts.map((c, i) => (
                    <div key={i} className="text-[10px] leading-relaxed">
                      <span className="font-bold">{c.name}</span>
                      {c.role && <span> ({c.role})</span>}
                      {c.phone && <span> {c.phone.replace(/^'/, '')}</span>}
                      {c.email && <span>  {c.email}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEBUG: Parser parsing log */}
            <TransportListParserDebugPanel
              parsingLog={h.parsingLog}
              serviceSummary={h.serviceSummary}
              showDebug={h.showDebug}
              onToggleDebug={() => h.setShowDebug(!h.showDebug)}
            />
          </>
        )}

        {/* STEP: Done */}
        {h.step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-[16px] font-semibold text-on-surface mb-2">Import Complete</h3>
            <p className="text-on-surface-variant text-[13px] max-w-md">
              {h.importResult?.created || h.services.filter(s => h.selectedRows.has(s.id)).length} servicios sincronizados con el Sheet
              {h.importResult?.skipped ? ` · ${h.importResult.skipped} duplicados omitidos` : ''}.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={h.clearFile}
                className="px-4 py-2 text-[13px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Import Another
              </button>
              <button
                onClick={() => onNavigate('transport', 'push')}
                className="px-4 py-2 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                View Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      <TransportListEmailModal
        isOpen={h.showEmailModal}
        onClose={() => h.setShowEmailModal(false)}
        onSend={h.handleSendEmail}
        recipients={h.emailRecipients}
        subject={h.emailSubject}
        dateStr={h.dateStr}
        selectedCount={h.selectedRows.size}
        isSending={h.isSending}
        onRecipientsChange={h.setEmailRecipients}
        onSubjectChange={h.setEmailSubject}
      />

      <TransportListAgencyModal
        isOpen={h.showAgencyModal}
        onClose={() => h.setShowAgencyModal(false)}
        agencies={h.agencies}
        agencyServices={h.agencyServices}
        selectedAgency={h.selectedAgency}
        agencyNotes={h.agencyNotes}
        loadingAgencies={h.loadingAgencies}
        isSending={h.isSending}
        onAgencyChange={h.setSelectedAgency}
        onNotesChange={h.setAgencyNotes}
        onRemoveService={(id) => h.setAgencyServices(prev => prev.filter(s => s.id !== id))}
        onSendWhatsApp={h.handleWhatsAppAgency}
        onSendEmail={h.handleSendToAgency}
      />

      <TransportListImportModal
        isOpen={h.showImportModal}
        onClose={() => { h.setShowImportModal(false); h.setStep('preview'); }}
        onConfirm={h.handleImportModalConfirm}
        production={h.production}
        projectName={h.projectName}
        selectedCount={h.selectedRows.size}
        operatingCompany={h.importModalOperatingCompany}
        clientId={h.importModalClientId}
        projectId={h.importModalProjectId}
        loading={h.importModalLoading}
        autoDetected={h.importModalAutoDetected}
        onOperatingCompanyChange={h.setImportModalOperatingCompany}
        onClientChange={h.setImportModalClientId}
        onProjectChange={h.setImportModalProjectId}
      />

      <TransportListExportResultModal
        result={h.exportResult}
        onClose={() => h.setExportResult(null)}
      />

      {/* Print Preview Modal — separated component tree for clean print output */}
      <PrintPreview
        isOpen={h.showPrintPreview}
        onClose={() => {
          h.setShowPrintPreview(false);
          if (h.pdfGeneratedForSave.current) {
            h.pdfGeneratedForSave.current = false;
            h.setShowSavePrompt(true);
          }
        }}
        onPrint={() => window.print()}
        services={h.services}
        selectedIds={h.selectedRows}
        production={h.production}
        projectName={h.projectName}
        transportCompany={h.transportCompany}
        dateStr={h.dateStr}
        footerContacts={h.footerContacts}
      />

      <TransportListSavePromptModal
        isOpen={h.showSavePrompt}
        selectedCount={h.selectedRows.size}
        onSave={() => { h.setShowSavePrompt(false); h.handleSync(); }}
        onDismiss={() => h.setShowSavePrompt(false)}
      />
    </div>
  );
}
