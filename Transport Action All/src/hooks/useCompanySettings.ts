import { useState, useEffect, useCallback } from 'react';
import { ScreenId } from '../types';
import {
  getSettings,
  saveSettings,
  getUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  deleteUser,
  createUser,
  updateUser,
  getAuditLog,
  AuditEntry,
  getOperatingCompanies,
  updateOperatingCompany,
  OperatingCompany,
  getVehicleTypes,
  getServiceTypes,
  saveVehicleTypes,
  saveServiceTypes,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface UseCompanySettingsProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function useCompanySettings({ onNavigate }: UseCompanySettingsProps) {
  const { user, token, can } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userAction, setUserAction] = useState<string | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', name: '', role: 'coordinator' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserData, setEditUserData] = useState({ name: '', email: '', role: 'coordinator' });
  const [isEditingUser, setIsEditingUser] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('');

  const [taEmail, setTaEmail] = useState('');
  const [taAddress, setTaAddress] = useState('');
  const [taName, setTaName] = useState('');
  const [taSubtitle, setTaSubtitle] = useState('');
  const [taVat, setTaVat] = useState('');
  const [taPhone, setTaPhone] = useState('');
  const [taCurrency, setTaCurrency] = useState('EUR');
  const [taTaxRate, setTaTaxRate] = useState('21');

  const [mmEmail, setMmEmail] = useState('');
  const [mmAddress, setMmAddress] = useState('');
  const [mmName, setMmName] = useState('');
  const [mmSubtitle, setMmSubtitle] = useState('');
  const [mmVat, setMmVat] = useState('');
  const [mmPhone, setMmPhone] = useState('');
  const [mmCurrency, setMmCurrency] = useState('EUR');
  const [mmTaxRate, setMmTaxRate] = useState('21');

  const [operatingCompanies, setOperatingCompanies] = useState<OperatingCompany[]>([]);

  const [editingCompany, setEditingCompany] = useState<'TA' | 'MM' | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [tempVat, setTempVat] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempCurrency, setTempCurrency] = useState('EUR');
  const [tempTaxRate, setTempTaxRate] = useState('21');

  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [editingWhatsApp, setEditingWhatsApp] = useState(false);
  const [tempWhatsApp, setTempWhatsApp] = useState('');

  const [emailTemplates, setEmailTemplates] = useState({
    orderConfirmation: 'Dear [Client_Name],\n\nYour transport service has been confirmed:\n\nDriver: [Driver_Name]\nVehicle: [Vehicle_Type]\nPickup: [Pickup_Time] at [Pickup_Location]\nDestination: [Dropoff_Location]\n\nBest regards,\nTransport Action',
    weeklySummary: 'Dear [Client_Name],\n\nWeekly transport summary for [Week_Date]:\n\nTotal Services: [Total_Services]\nCompleted: [Completed]\nCancelled: [Cancelled]\n\nDetailed report attached.\n\nBest regards,\nTransport Action',
    invoice: 'Invoice for transport services rendered.\n\nPO: [PO_Number]\nProduction: [Production]\nPeriod: [Date_Range]\n\nTotal: €[Total_Amount]\n\nPayment terms: Net 30 days.\n\nTransport Action',
  });
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<'orderConfirmation' | 'weeklySummary' | 'invoice' | null>(null);
  const [tempEmailTemplate, setTempEmailTemplate] = useState('');

  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [newServiceType, setNewServiceType] = useState('');
  const [isSavingEnums, setIsSavingEnums] = useState(false);

  const loadUsers = useCallback(async () => {
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
  }, [token, can]);

  const loadAuditLogs = useCallback(async () => {
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
  }, [can]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getSettings(),
      getOperatingCompanies(),
      getVehicleTypes(),
      getServiceTypes(),
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
        setWhatsappTemplate(
          cfg.whatsapp_template ||
            'Hello [Driver_Name], your new assignment [Project_ID] is ready for [Pickup_Time]. Destination: [Dropoff_Location]. Tap here to confirm: [Link]'
        );
        setEmailTemplates({
          orderConfirmation:
            cfg.email_order_confirmation ||
            'Dear [Client_Name],\n\nYour transport service has been confirmed:\n\nDriver: [Driver_Name]\nVehicle: [Vehicle_Type]\nPickup: [Pickup_Time] at [Pickup_Location]\nDestination: [Dropoff_Location]\n\nBest regards,\nTransport Action',
          weeklySummary:
            cfg.email_weekly_summary ||
            'Dear [Client_Name],\n\nWeekly transport summary for [Week_Date]:\n\nTotal Services: [Total_Services]\nCompleted: [Completed]\nCancelled: [Cancelled]\n\nDetailed report attached.\n\nBest regards,\nTransport Action',
          invoice:
            cfg.email_invoice ||
            'Invoice for transport services rendered.\n\nPO: [PO_Number]\nProduction: [Production]\nPeriod: [Date_Range]\n\nTotal: €[Total_Amount]\n\nPayment terms: Net 30 days.\n\nTransport Action',
        });

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
      .catch((err) => {
        console.error('[CompanySettings] load error:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (can('userManagement')) {
      loadAuditLogs();
    }
  }, [can, loadAuditLogs]);

  useEffect(() => {
    if (can('userManagement')) {
      loadUsers();
    }
  }, [can, token, loadUsers]);

  const filteredLogs = auditLogs.filter((log) => {
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

  const handleApproveUser = useCallback(
    async (userId: string) => {
      if (!token) return;
      setUserAction(userId);
      try {
        await approveUser(token, userId);
        await loadUsers();
      } finally {
        setUserAction(null);
      }
    },
    [token, loadUsers]
  );

  const handleRejectUser = useCallback(
    async (userId: string) => {
      if (!token) return;
      setUserAction(userId);
      try {
        await rejectUser(token, userId);
        await loadUsers();
      } finally {
        setUserAction(null);
      }
    },
    [token, loadUsers]
  );

  const handleToggleRole = useCallback(
    async (userId: string, currentRole: string) => {
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
    },
    [token, loadUsers]
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!token || !confirm('Are you sure you want to delete this user?')) return;
      setUserAction(userId);
      try {
        await deleteUser(token, userId);
        await loadUsers();
      } finally {
        setUserAction(null);
      }
    },
    [token, loadUsers]
  );

  const handleCreateUser = useCallback(async () => {
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
  }, [token, newUser, loadUsers]);

  const handleEditUser = useCallback(async () => {
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
  }, [token, editingUser, editUserData, loadUsers]);

  const handleSave = useCallback(async () => {
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
        saveServiceTypes(serviceTypes),
      ]);

      const errors = [settingsResult, vtResult, stResult].filter((r) => r.error).map((r) => r.error);
      if (errors.length > 0) {
        showToast('Error: ' + errors.join(', '), 'error');
      } else {
        showToast('Settings saved successfully!', 'success');
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    taEmail,
    taAddress,
    taName,
    taSubtitle,
    mmEmail,
    mmAddress,
    mmName,
    mmSubtitle,
    whatsappTemplate,
    emailTemplates,
    vehicleTypes,
    serviceTypes,
    showToast,
  ]);

  const openCompanyEdit = useCallback(
    (company: 'TA' | 'MM') => {
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
    },
    [taEmail, taAddress, taVat, taPhone, taCurrency, taTaxRate, mmEmail, mmAddress, mmVat, mmPhone, mmCurrency, mmTaxRate]
  );

  const saveCompanyEdit = useCallback(async () => {
    if (editingCompany) {
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
  }, [editingCompany, tempEmail, tempAddress, tempVat, tempPhone, tempCurrency, tempTaxRate]);

  const openWhatsAppEdit = useCallback(() => {
    setTempWhatsApp(whatsappTemplate);
    setEditingWhatsApp(true);
  }, [whatsappTemplate]);

  const saveWhatsAppEdit = useCallback(() => {
    setWhatsappTemplate(tempWhatsApp);
    setEditingWhatsApp(false);
  }, [tempWhatsApp]);

  const handleEditEmailTemplate = useCallback(
    (key: 'orderConfirmation' | 'weeklySummary' | 'invoice', template: string) => {
      setTempEmailTemplate(template);
      setEditingEmailTemplate(key);
    },
    []
  );

  const handleSaveEmailTemplate = useCallback(() => {
    if (!editingEmailTemplate) return;
    setEmailTemplates({ ...emailTemplates, [editingEmailTemplate]: tempEmailTemplate });
    setEditingEmailTemplate(null);
  }, [editingEmailTemplate, emailTemplates, tempEmailTemplate]);

  return {
    user,
    token,
    can,
    onNavigate,

    isLoading,
    isSaving,
    config,

    users,
    isLoadingUsers,
    userAction,
    showCreateUser,
    newUser,
    isCreatingUser,
    editingUser,
    editUserData,
    isEditingUser,

    auditLogs,
    isLoadingLogs,
    logFilter,
    filteredLogs,

    taEmail,
    taAddress,
    taName,
    taSubtitle,
    taVat,
    taPhone,
    taCurrency,
    taTaxRate,

    mmEmail,
    mmAddress,
    mmName,
    mmSubtitle,
    mmVat,
    mmPhone,
    mmCurrency,
    mmTaxRate,

    operatingCompanies,

    editingCompany,
    tempEmail,
    tempAddress,
    tempVat,
    tempPhone,
    tempCurrency,
    tempTaxRate,

    whatsappTemplate,
    editingWhatsApp,
    tempWhatsApp,

    emailTemplates,
    editingEmailTemplate,
    tempEmailTemplate,

    vehicleTypes,
    serviceTypes,
    newVehicleType,
    newServiceType,
    isSavingEnums,

    setEditingCompany,
    setTaName,
    setTaSubtitle,
    setMmName,
    setMmSubtitle,
    setLogFilter,
    setShowCreateUser,
    setNewUser,
    setEditingUser,
    setEditUserData,
    setTempEmail,
    setTempAddress,
    setTempVat,
    setTempPhone,
    setTempCurrency,
    setTempTaxRate,
    setTempWhatsApp,
    setTempEmailTemplate,
    setEditingEmailTemplate,
    setNewVehicleType,
    setNewServiceType,
    setVehicleTypes,
    setServiceTypes,

    loadUsers,
    loadAuditLogs,
    handleApproveUser,
    handleRejectUser,
    handleToggleRole,
    handleDeleteUser,
    handleCreateUser,
    handleEditUser,
    handleSave,
    openCompanyEdit,
    saveCompanyEdit,
    openWhatsAppEdit,
    saveWhatsAppEdit,
    handleEditEmailTemplate,
    handleSaveEmailTemplate,
  };
}
