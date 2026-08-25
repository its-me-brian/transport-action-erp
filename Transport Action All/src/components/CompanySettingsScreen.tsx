import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { ScreenId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import useCompanySettings from '../hooks/useCompanySettings';
import CompanyProfileCards from './CompanyProfileCards';
import PricingReferenceSection from './PricingReferenceSection';
import IntegrationSettingsSection from './IntegrationSettingsSection';
import SettingsModals from './SettingsModals';
import AuditLogSection from './AuditLogSection';
import UserManagementSection from './UserManagementSection';
import { Skeleton } from './ui/Skeleton';

interface CompanySettingsScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function CompanySettingsScreen({ onNavigate }: CompanySettingsScreenProps) {
  const { can } = useAuth();
  const {
    isLoading, isSaving,
    users, isLoadingUsers, userAction,
    showCreateUser, newUser, isCreatingUser,
    editingUser, editUserData, isEditingUser,
    auditLogs, isLoadingLogs, logFilter, filteredLogs,
    taEmail, taAddress, taName, taSubtitle, taVat, taPhone, taCurrency, taTaxRate,
    mmEmail, mmAddress, mmName, mmSubtitle, mmVat, mmPhone, mmCurrency, mmTaxRate,
    editingCompany, setEditingCompany, tempEmail, tempAddress, tempVat, tempPhone, tempCurrency, tempTaxRate,
    whatsappTemplate, editingWhatsApp, tempWhatsApp,
    emailTemplates, editingEmailTemplate, tempEmailTemplate,
    vehicleTypes, serviceTypes, newVehicleType, newServiceType, isSavingEnums,
    setTaName, setTaSubtitle, setMmName, setMmSubtitle,
    setLogFilter, setShowCreateUser, setNewUser,
    setEditingUser, setEditUserData,
    setTempEmail, setTempAddress, setTempVat, setTempPhone, setTempCurrency, setTempTaxRate,
    setTempWhatsApp, setTempEmailTemplate, setEditingEmailTemplate,
    setNewVehicleType, setNewServiceType, setVehicleTypes, setServiceTypes,
    loadUsers, loadAuditLogs,
    handleApproveUser, handleRejectUser, handleToggleRole, handleDeleteUser,
    handleCreateUser, handleEditUser, handleSave,
    openCompanyEdit, saveCompanyEdit,
    openWhatsAppEdit, saveWhatsAppEdit,
    handleEditEmailTemplate, handleSaveEmailTemplate,
  } = useCompanySettings({ onNavigate });

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6" role="status">
        <span className="sr-only">Loading...</span>
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="company-settings-screen" className={`flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24 ${!can('settings.write') ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header Area */}
      <div id="settings-title-area" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Company Settings</h1>
          <p className="text-[13px] text-on-surface-variant">
            {can('settings.write') ? 'Configure company parameters and notification templates.' : 'View only — contact an admin to make changes.'}
          </p>
        </div>
        {can('settings.write') && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        )}
      </div>

      {/* General Profiles */}
      <CompanyProfileCards
        taName={taName}
        onTaNameChange={setTaName}
        taSubtitle={taSubtitle}
        onTaSubtitleChange={setTaSubtitle}
        taEmail={taEmail}
        taAddress={taAddress}
        taVat={taVat}
        taPhone={taPhone}
        taCurrency={taCurrency}
        taTaxRate={taTaxRate}
        mmName={mmName}
        onMmNameChange={setMmName}
        mmSubtitle={mmSubtitle}
        onMmSubtitleChange={setMmSubtitle}
        mmEmail={mmEmail}
        mmAddress={mmAddress}
        mmVat={mmVat}
        mmPhone={mmPhone}
        mmCurrency={mmCurrency}
        mmTaxRate={mmTaxRate}
        onEditCompany={openCompanyEdit}
      />

      {/* Pricing Reference */}
      <PricingReferenceSection
        serviceTypes={serviceTypes}
        onServiceTypesChange={setServiceTypes}
        newServiceType={newServiceType}
        onNewServiceTypeChange={setNewServiceType}
        vehicleTypes={vehicleTypes}
        onVehicleTypesChange={setVehicleTypes}
        newVehicleType={newVehicleType}
        onNewVehicleTypeChange={setNewVehicleType}
        onNavigate={onNavigate}
      />

      {/* Integration Settings */}
      <IntegrationSettingsSection
        whatsappTemplate={whatsappTemplate}
        onConfigureWhatsApp={openWhatsAppEdit}
        emailTemplates={emailTemplates}
        onEditEmailTemplate={(key, template) => {
          setTempEmailTemplate(template);
          setEditingEmailTemplate(key);
        }}
      />

      {/* Modals */}
      <SettingsModals
        editingCompany={editingCompany}
        onCloseCompanyEdit={() => setEditingCompany(null)}
        onSaveCompanyEdit={saveCompanyEdit}
        tempEmail={tempEmail}
        onTempEmailChange={setTempEmail}
        tempAddress={tempAddress}
        onTempAddressChange={setTempAddress}
        tempVat={tempVat}
        onTempVatChange={setTempVat}
        tempPhone={tempPhone}
        onTempPhoneChange={setTempPhone}
        tempCurrency={tempCurrency}
        onTempCurrencyChange={setTempCurrency}
        tempTaxRate={tempTaxRate}
        onTempTaxRateChange={setTempTaxRate}
        editingWhatsApp={editingWhatsApp}
        onCloseWhatsApp={() => setEditingWhatsApp(false)}
        onSaveWhatsApp={saveWhatsAppEdit}
        tempWhatsApp={tempWhatsApp}
        onTempWhatsAppChange={setTempWhatsApp}
        editingEmailTemplate={editingEmailTemplate}
        onCloseEmailTemplate={() => setEditingEmailTemplate(null)}
        onSaveEmailTemplate={handleSaveEmailTemplate}
        tempEmailTemplate={tempEmailTemplate}
        onTempEmailTemplateChange={setTempEmailTemplate}
      />

      {/* Audit Log (Admin Only) */}
      {can('userManagement') && (
        <AuditLogSection
          auditLogs={auditLogs}
          isLoadingLogs={isLoadingLogs}
          logFilter={logFilter}
          onLogFilterChange={setLogFilter}
          filteredLogs={filteredLogs}
        />
      )}

      {/* User Management */}
      {can('userManagement') && (
        <UserManagementSection
          users={users}
          isLoadingUsers={isLoadingUsers}
          userAction={userAction}
          onApproveUser={handleApproveUser}
          onRejectUser={handleRejectUser}
          onToggleRole={handleToggleRole}
          onDeleteUser={handleDeleteUser}
          onCreateUser={handleCreateUser}
          showCreateUser={showCreateUser}
          onShowCreateUserChange={setShowCreateUser}
          newUser={newUser}
          onNewUserChange={setNewUser}
          isCreatingUser={isCreatingUser}
          editingUser={editingUser}
          onEditingUserChange={setEditingUser}
          editUserData={editUserData}
          onEditUserDataChange={setEditUserData}
          onEditUser={handleEditUser}
          isEditingUser={isEditingUser}
        />
      )}
    </div>
  );
}
