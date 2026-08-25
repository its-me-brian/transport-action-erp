import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { ScreenId } from '../types';
import { getSettings, saveSettings, getUsers, approveUser, rejectUser, updateUserRole, deleteUser, createUser, updateUser, getAuditLog, AuditEntry, getOperatingCompanies, updateOperatingCompany, OperatingCompany, getVehicleTypes, getServiceTypes, saveVehicleTypes, saveServiceTypes } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import CompanyProfileCards from './CompanyProfileCards';
import PricingReferenceSection from './PricingReferenceSection';
import IntegrationSettingsSection from './IntegrationSettingsSection';
import SettingsModals from './SettingsModals';
import AuditLogSection from './AuditLogSection';
import UserManagementSection from './UserManagementSection';

interface CompanySettingsScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function CompanySettingsScreen({ onNavigate }: CompanySettingsScreenProps) {
  const { user, token, can } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});

  // User management (admin only)
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userAction, setUserAction] = useState<string | null>(null);

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', name: '', role: 'coordinator' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserData, setEditUserData] = useState({ name: '', email: '', role: 'coordinator' });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Audit log (admin only)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('');

  // Company TA
  const [taEmail, setTaEmail] = useState('');
  const [taAddress, setTaAddress] = useState('');
  const [taName, setTaName] = useState('');
  const [taSubtitle, setTaSubtitle] = useState('');
  const [taVat, setTaVat] = useState('');
  const [taPhone, setTaPhone] = useState('');
  const [taCurrency, setTaCurrency] = useState('EUR');
  const [taTaxRate, setTaTaxRate] = useState('21');
  
  // Company MM
  const [mmEmail, setMmEmail] = useState('');
  const [mmAddress, setMmAddress] = useState('');
  const [mmName, setMmName] = useState('');
  const [mmSubtitle, setMmSubtitle] = useState('');
  const [mmVat, setMmVat] = useState('');
  const [mmPhone, setMmPhone] = useState('');
  const [mmCurrency, setMmCurrency] = useState('EUR');
  const [mmTaxRate, setMmTaxRate] = useState('21');

  // OperatingCompany entities from DB
  const [operatingCompanies, setOperatingCompanies] = useState<OperatingCompany[]>([]);

  // Modal editor values
  const [editingCompany, setEditingCompany] = useState<'TA' | 'MM' | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [tempVat, setTempVat] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempCurrency, setTempCurrency] = useState('EUR');
  const [tempTaxRate, setTempTaxRate] = useState('21');

  // WhatsApp template
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [editingWhatsApp, setEditingWhatsApp] = useState(false);
  const [tempWhatsApp, setTempWhatsApp] = useState('');

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState({
    orderConfirmation: 'Dear [Client_Name],\n\nYour transport service has been confirmed:\n\nDriver: [Driver_Name]\nVehicle: [Vehicle_Type]\nPickup: [Pickup_Time] at [Pickup_Location]\nDestination: [Dropoff_Location]\n\nBest regards,\nTransport Action',
    weeklySummary: 'Dear [Client_Name],\n\nWeekly transport summary for [Week_Date]:\n\nTotal Services: [Total_Services]\nCompleted: [Completed]\nCancelled: [Cancelled]\n\nDetailed report attached.\n\nBest regards,\nTransport Action',
    invoice: 'Invoice for transport services rendered.\n\nPO: [PO_Number]\nProduction: [Production]\nPeriod: [Date_Range]\n\nTotal: €[Total_Amount]\n\nPayment terms: Net 30 days.\n\nTransport Action',
  });
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<'orderConfirmation' | 'weeklySummary' | 'invoice' | null>(null);
  const [tempEmailTemplate, setTempEmailTemplate] = useState('');

  // Vehicle Types & Service Types (admin-configurable)
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [newServiceType, setNewServiceType] = useState('');
  const [isSavingEnums, setIsSavingEnums] = useState(false);

  // Vehicles — REMOVED: was dead config (fictional "Heavy Hauler Ultra" etc, never used in pricing)
  // Standard Rates — REMOVED: was dead config (€450/8.5%/1.5x never used in pricing engine)

  // Load config from DB
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getSettings(),
      getOperatingCompanies(),
      getVehicleTypes(),
      getServiceTypes()
    ])
      .then(([cfg, companies, vt, st]) => {
        setConfig(cfg);
        setVehicleTypes(vt);
        setServiceTypes(st);
        setTaEmail(cfg.ta_email || 'dispatch@transportaction.com');
        setTaAddress(cfg.ta_address || '42 Industrial Way, London E14 9TP');
        setTaName(cfg.ta_name || 'Transport Action');
        setTaSubtitle(cfg.ta_subtitle || 'Industrial Logistics');
        setMmEmail(cfg.mm_email || 'production@moviemotion.io');
        setMmAddress(cfg.mm_address || 'Studio 4, Pinewood Way, SL0 0NH');
        setMmName(cfg.mm_name || 'Movie Motion');
        setMmSubtitle(cfg.mm_subtitle || 'Cinematic Logistics');
        setWhatsappTemplate(cfg.whatsapp_template || 'Hello [Driver_Name], your new assignment [Project_ID] is ready for [Pickup_Time]. Destination: [Dropoff_Location]. Tap here to confirm: [Link]');
        setEmailTemplates({
          orderConfirmation: cfg.email_order_confirmation || 'Dear [Client_Name],\n\nYour transport service has been confirmed:\n\nDriver: [Driver_Name]\nVehicle: [Vehicle_Type]\nPickup: [Pickup_Time] at [Pickup_Location]\nDestination: [Dropoff_Location]\n\nBest regards,\nTransport Action',
          weeklySummary: cfg.email_weekly_summary || 'Dear [Client_Name],\n\nWeekly transport summary for [Week_Date]:\n\nTotal Services: [Total_Services]\nCompleted: [Completed]\nCancelled: [Cancelled]\n\nDetailed report attached.\n\nBest regards,\nTransport Action',
          invoice: cfg.email_invoice || 'Invoice for transport services rendered.\n\nPO: [PO_Number]\nProduction: [Production]\nPeriod: [Date_Range]\n\nTotal: €[Total_Amount]\n\nPayment terms: Net 30 days.\n\nTransport Action',
        });
        
        // Load OperatingCompany data
        setOperatingCompanies(companies);
        const ta = companies.find((c: OperatingCompany) => c.id === 'TA');
        const mm = companies.find((c: OperatingCompany) => c.id === 'MM');
        if (ta) {
          setTaVat(ta.vat || '');
          setTaPhone(ta.phone || '');
          setTaCurrency(ta.currency || 'EUR');
          setTaTaxRate(String(ta.defaultTaxRate || 21));
        }
        if (mm) {
          setMmVat(mm.vat || '');
          setMmPhone(mm.phone || '');
          setMmCurrency(mm.currency || 'EUR');
          setMmTaxRate(String(mm.defaultTaxRate || 21));
        }
      })
      .catch(err => {
        console.error('[CompanySettings] load error:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Load users (admin only)
  const loadUsers = async () => {
    if (!token || !can('userManagement')) return;
    setIsLoadingUsers(true);
    try {
      const result = await getUsers(token);
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } catch (err) {
      console.error('[CompanySettings] load users error:', err);
    } finally {
      setIsLoadingUsers(false);
      setUserAction(null);
    }
  };

  // Load audit logs (admin only)
  const loadAuditLogs = async () => {
    if (!can('userManagement')) return;
    setIsLoadingLogs(true);
    try {
      const logs = await getAuditLog(200);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('[CompanySettings] load audit logs error:', err);
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (can('userManagement')) {
      loadAuditLogs();
    }
  }, [can]);

  const filteredLogs = auditLogs.filter(log => {
    if (!logFilter) return true;
    const f = logFilter.toLowerCase();
    return (
      (log.user || '').toLowerCase().includes(f) ||
      (log.action || '').toLowerCase().includes(f) ||
      (log.entity || '').toLowerCase().includes(f) ||
      (log.entityId || '').toLowerCase().includes(f) ||
      (log.notes || '').toLowerCase().includes(f)
    );
  });


  useEffect(() => {
    if (can('userManagement')) {
      loadUsers();
    }
  }, [can, token]);

  // User management actions
  const handleApproveUser = async (userId: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      await approveUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      await rejectUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      const roles = ['admin', 'coordinator', 'accounting', 'driver'];
      const idx = roles.indexOf(currentRole);
      const newRole = roles[(idx + 1) % roles.length];
      await updateUserRole(token, userId, newRole);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token || !confirm('Are you sure you want to delete this user?')) return;
    setUserAction(userId);
    try {
      await deleteUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleCreateUser = async () => {
    if (!token || !newUser.username || !newUser.email || !newUser.password) return;
    setIsCreatingUser(true);
    try {
      await createUser(token, newUser);
      setNewUser({ username: '', email: '', password: '', name: '', role: 'coordinator' });
      await loadUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
    } finally {
      setIsCreatingUser(false);
      setShowCreateUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!token || !editingUser) return;
    setIsEditingUser(true);
    try {
      await updateUser(token, editingUser.id, editUserData);
      await loadUsers();
    } catch (err) {
      console.error('Failed to edit user:', err);
    } finally {
      setIsEditingUser(false);
      setEditingUser(null);
    }
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave: Record<string, string> = {
        ta_email: taEmail,
        ta_address: taAddress,
        ta_name: taName,
        ta_subtitle: taSubtitle,
        mm_email: mmEmail,
        mm_address: mmAddress,
        mm_name: mmName,
        mm_subtitle: mmSubtitle,
        whatsapp_template: whatsappTemplate,
        email_order_confirmation: emailTemplates.orderConfirmation,
        email_weekly_summary: emailTemplates.weeklySummary,
        email_invoice: emailTemplates.invoice,
      };
      
      const [settingsResult, vtResult, stResult] = await Promise.all([
        saveSettings(toSave),
        saveVehicleTypes(vehicleTypes),
        saveServiceTypes(serviceTypes)
      ]);

      const errors = [settingsResult, vtResult, stResult].filter(r => r.error).map(r => r.error);
      if (errors.length > 0) {
        showToast('Error: ' + errors.join(', '), 'error');
      } else {
        showToast('Settings saved successfully!', 'success');
      }
    } catch (err) {
      showToast('Error: ' + (err.message || 'Unknown'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openCompanyEdit = (company: 'TA' | 'MM') => {
    setEditingCompany(company);
    if (company === 'TA') {
      setTempEmail(taEmail);
      setTempAddress(taAddress);
      setTempVat(taVat);
      setTempPhone(taPhone);
      setTempCurrency(taCurrency);
      setTempTaxRate(taTaxRate);
    } else {
      setTempEmail(mmEmail);
      setTempAddress(mmAddress);
      setTempVat(mmVat);
      setTempPhone(mmPhone);
      setTempCurrency(mmCurrency);
      setTempTaxRate(mmTaxRate);
    }
  };

  const saveCompanyEdit = async () => {
    if (editingCompany) {
      // Save to OperatingCompany entity
      try {
        await updateOperatingCompany(editingCompany, {
          email: tempEmail,
          address: tempAddress,
          vat: tempVat,
          phone: tempPhone,
          currency: tempCurrency,
          defaultTaxRate: parseFloat(tempTaxRate) || 21,
        });
      } catch (err) {
        console.error('[CompanySettings] save operating company error:', err);
      }
      
      // Also update local state for display
      if (editingCompany === 'TA') {
        setTaEmail(tempEmail);
        setTaAddress(tempAddress);
        setTaVat(tempVat);
        setTaPhone(tempPhone);
        setTaCurrency(tempCurrency);
        setTaTaxRate(tempTaxRate);
      } else if (editingCompany === 'MM') {
        setMmEmail(tempEmail);
        setMmAddress(tempAddress);
        setMmVat(tempVat);
        setMmPhone(tempPhone);
        setMmCurrency(tempCurrency);
        setMmTaxRate(tempTaxRate);
      }
    }
    setEditingCompany(null);
  };

  const openWhatsAppEdit = () => {
    setTempWhatsApp(whatsappTemplate);
    setEditingWhatsApp(true);
  };

  const saveWhatsAppEdit = () => {
    setWhatsappTemplate(tempWhatsApp);
    setEditingWhatsApp(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6">
        <div className="space-y-2">
          <div className="h-6 bg-surface-container-highest rounded w-40 animate-pulse" />
          <div className="h-3 bg-surface-container-highest rounded w-64 animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-surface-container-highest rounded w-4 animate-pulse" />
              <div className="h-4 bg-surface-container-highest rounded w-32 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
                  <div className="h-3 bg-surface-container-highest rounded w-24 animate-pulse" />
                  <div className="h-8 bg-surface-container-highest rounded w-full animate-pulse" />
                  <div className="h-2.5 bg-surface-container-highest rounded w-32 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="company-settings-screen" className={`flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8 ${!can('settings.write') ? 'opacity-70 pointer-events-none' : ''}`}>
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
        onSaveEmailTemplate={() => {
          setEmailTemplates({ ...emailTemplates, [editingEmailTemplate!]: tempEmailTemplate });
          setEditingEmailTemplate(null);
        }}
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
