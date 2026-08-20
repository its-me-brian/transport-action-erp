import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Pencil, 
  Settings, 
  Check, 
  Sliders, 
  MoreVertical, 
  FileText, 
  ChevronRight, 
  Link as LinkIcon, 
  MessageSquare, 
  CheckCircle, 
  Wrench,
  Mail,
  MapPin,
  X,
  Loader2,
  Save,
  Users,
  UserCheck,
  UserX,
  Shield,
  Trash2,
  History,
  Plus,
  Edit3
} from 'lucide-react';
import { ScreenId } from '../types';
import { getSettings, saveSettings, getUsers, approveUser, rejectUser, updateUserRole, deleteUser, createUser, updateUser, getAuditLog, AuditEntry, getOperatingCompanies, updateOperatingCompany, OperatingCompany } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

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

  // Vehicles — REMOVED: was dead config (fictional "Heavy Hauler Ultra" etc, never used in pricing)
  // Standard Rates — REMOVED: was dead config (€450/8.5%/1.5x never used in pricing engine)

  // Load config from DB
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getSettings(),
      getOperatingCompanies()
    ])
      .then(([cfg, companies]) => {
        setConfig(cfg);
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
      
      const result = await saveSettings(toSave);
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
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
      <section id="general-profiles-section" className="space-y-2">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-on-surface">General Profiles</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Transport Action Card */}
          <div id="profile-card-ta" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant hover:bg-surface-dim/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <input
                    value={taName}
                    onChange={(e) => setTaName(e.target.value)}
                    className="text-[14px] font-semibold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                  />
                  <input
                    value={taSubtitle}
                    onChange={(e) => setTaSubtitle(e.target.value)}
                    className="text-[11px] text-primary font-medium bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                  />
                </div>
              </div>
              <button 
                id="edit-profile-ta-btn"
                onClick={() => openCompanyEdit('TA')}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
            
            <div className="space-y-2 text-[12px]">
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Contact</label>
                <p className="text-on-surface font-medium">{taEmail}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Address</label>
                <p className="text-on-surface-variant flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> {taAddress}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/50">
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">VAT</label>
                  <p className="text-on-surface font-medium">{taVat || '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</label>
                  <p className="text-on-surface font-medium">{taPhone || '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Currency</label>
                  <p className="text-on-surface font-medium">{taCurrency}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Tax Rate</label>
                  <p className="text-on-surface font-medium">{taTaxRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Movie Motion Card */}
          <div id="profile-card-mm" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant hover:bg-surface-dim/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <input
                    value={mmName}
                    onChange={(e) => setMmName(e.target.value)}
                    className="text-[14px] font-semibold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                  />
                  <input
                    value={mmSubtitle}
                    onChange={(e) => setMmSubtitle(e.target.value)}
                    className="text-[11px] text-secondary font-medium bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary outline-none w-full"
                  />
                </div>
              </div>
              <button 
                id="edit-profile-mm-btn"
                onClick={() => openCompanyEdit('MM')}
                className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-secondary" />
              </button>
            </div>
            
            <div className="space-y-2 text-[12px]">
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Contact</label>
                <p className="text-on-surface font-medium">{mmEmail}</p>
              </div>
              <div>
                <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Address</label>
                <p className="text-on-surface-variant flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-secondary" /> {mmAddress}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/50">
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">VAT</label>
                  <p className="text-on-surface font-medium">{mmVat || '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</label>
                  <p className="text-on-surface font-medium">{mmPhone || '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Currency</label>
                  <p className="text-on-surface font-medium">{mmCurrency}</p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wide">Tax Rate</label>
                  <p className="text-on-surface font-medium">{mmTaxRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Reference */}
      <section id="pricing-reference-section" className="space-y-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-on-surface">Pricing Reference</h3>
        </div>
        <p className="text-[11px] text-on-surface-variant">Service types and vehicle types used across the system. Configure rates in Rate Cards (revenue) and Provider Rates (cost).</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Service Types */}
          <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
            <h5 className="text-[13px] font-semibold text-on-surface mb-3">Service Types</h5>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">Dispo</span>
                <span className="text-[11px] text-on-surface-variant">Full-day disposal. Base + extra km + extra hours + diaria.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">Transfer Airport</span>
                <span className="text-[11px] text-on-surface-variant">Fixed-price airport transfers. Includes airport surcharge.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">Transfer City</span>
                <span className="text-[11px] text-on-surface-variant">Fixed-price city transfers. Base rate applies.</span>
              </div>
            </div>
          </div>

          {/* Vehicle Types */}
          <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
            <h5 className="text-[13px] font-semibold text-on-surface mb-3">Vehicle Types</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-[10px] font-medium rounded">Van</span>
                <span className="text-[11px] text-on-surface-variant">Standard production van. Default for most services.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-[10px] font-medium rounded">Car</span>
                <span className="text-[11px] text-on-surface-variant">Sedan/car for executive or small-party transport.</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
            <h5 className="text-[13px] font-semibold text-on-surface mb-3">Configure Rates</h5>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('rate_cards')}
                className="w-full flex items-center justify-between p-2 bg-surface-dim/30 rounded-lg hover:bg-surface-dim/60 transition-colors text-left cursor-pointer"
              >
                <div>
                  <p className="text-[12px] font-medium text-on-surface">Rate Cards</p>
                  <p className="text-[10px] text-on-surface-variant">Client revenue pricing</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
              <button
                onClick={() => onNavigate('providers')}
                className="w-full flex items-center justify-between p-2 bg-surface-dim/30 rounded-lg hover:bg-surface-dim/60 transition-colors text-left cursor-pointer"
              >
                <div>
                  <p className="text-[12px] font-medium text-on-surface">Provider Rates</p>
                  <p className="text-[10px] text-on-surface-variant">Supplier & driver costs</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Settings */}
      <section id="integration-settings-section" className="space-y-2 pb-8">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-on-surface">Integration Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* WhatsApp Template */}
          <div id="integration-card-whatsapp" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h5 className="text-[13px] font-medium text-on-surface">WhatsApp Dispatch</h5>
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">Connected</span>
                </div>
              </div>
              
              <div className="p-2 bg-surface-dim/50 rounded border border-outline-variant/50 text-[11px] font-mono leading-relaxed text-on-surface-variant">
                "{whatsappTemplate}"
              </div>
            </div>
            
            <button 
              id="configure-whatsapp-template-btn"
              onClick={openWhatsAppEdit}
              className="w-full mt-3 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg text-[12px] font-medium hover:bg-surface-dim transition-colors cursor-pointer"
            >
              Configure Template
            </button>
          </div>

          {/* Email Templates */}
          <div id="integration-card-email" className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <h5 className="text-[13px] font-medium text-on-surface">Client Confirmation</h5>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Connected</span>
              </div>
            </div>
            
            <div className="space-y-1 text-[12px]">
              <div 
                onClick={() => { setTempEmailTemplate(emailTemplates.orderConfirmation); setEditingEmailTemplate('orderConfirmation'); }}
                className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium"
              >
                <span>Order Confirmation PDF</span>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </div>
              <div 
                onClick={() => { setTempEmailTemplate(emailTemplates.weeklySummary); setEditingEmailTemplate('weeklySummary'); }}
                className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium"
              >
                <span>Weekly Summary Report</span>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </div>
              <div 
                onClick={() => { setTempEmailTemplate(emailTemplates.invoice); setEditingEmailTemplate('invoice'); }}
                className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium text-primary"
              >
                <span>Invoice Generation (Stripe)</span>
                <LinkIcon className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {editingCompany && (
        <div id="company-edit-modal-backdrop" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div id="company-edit-modal" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[14px] font-semibold text-primary">
                Edit {editingCompany === 'TA' ? 'Transport Action' : 'Movie Motion'}
              </h3>
              <button onClick={() => setEditingCompany(null)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Contact Email</label>
                <input 
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Address</label>
                <input 
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">VAT / Tax ID</label>
                  <input 
                    type="text"
                    value={tempVat}
                    onChange={(e) => setTempVat(e.target.value)}
                    placeholder="IT12345678901"
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Phone</label>
                  <input 
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="+39 06 1234567"
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Currency</label>
                  <select 
                    value={tempCurrency}
                    onChange={(e) => setTempCurrency(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (CHF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Default Tax Rate (%)</label>
                  <input 
                    type="number"
                    value={tempTaxRate}
                    onChange={(e) => setTempTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button 
                  onClick={() => setEditingCompany(null)}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveCompanyEdit}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded font-medium hover:bg-primary-hover"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingWhatsApp && (
        <div id="whatsapp-edit-modal-backdrop" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div id="whatsapp-edit-modal" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-lg w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[14px] font-semibold text-emerald-600">
                WhatsApp Template
              </h3>
              <button onClick={() => setEditingWhatsApp(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Template</label>
                <textarea 
                  rows={4}
                  value={tempWhatsApp}
                  onChange={(e) => setTempWhatsApp(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-emerald-600 font-mono text-[11px] leading-relaxed outline-none"
                />
                <span className="text-on-surface-variant text-[10px] mt-1 block">
                  Variables: <code>[Driver_Name]</code>, <code>[Project_ID]</code>, <code>[Pickup_Time]</code>, <code>[Dropoff_Location]</code>, <code>[Link]</code>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button 
                  onClick={() => setEditingWhatsApp(false)}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveWhatsAppEdit}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {editingEmailTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-lg w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[14px] font-semibold text-primary">
                {editingEmailTemplate === 'orderConfirmation' && 'Order Confirmation Template'}
                {editingEmailTemplate === 'weeklySummary' && 'Weekly Summary Template'}
                {editingEmailTemplate === 'invoice' && 'Invoice Template'}
              </h3>
              <button onClick={() => setEditingEmailTemplate(null)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Email Body</label>
                <textarea 
                  rows={8}
                  value={tempEmailTemplate}
                  onChange={(e) => setTempEmailTemplate(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary font-mono text-[11px] leading-relaxed outline-none resize-none"
                />
                <span className="text-on-surface-variant text-[10px] mt-1 block">
                  Variables: <code>[Client_Name]</code>, <code>[Driver_Name]</code>, <code>[Vehicle_Type]</code>, <code>[Pickup_Time]</code>, <code>[Pickup_Location]</code>, <code>[Dropoff_Location]</code>, <code>[PO_Number]</code>, <code>[Production]</code>, <code>[Date_Range]</code>, <code>[Total_Services]</code>, <code>[Completed]</code>, <code>[Cancelled]</code>, <code>[Total_Amount]</code>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button 
                  onClick={() => setEditingEmailTemplate(null)}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setEmailTemplates({ ...emailTemplates, [editingEmailTemplate]: tempEmailTemplate });
                    setEditingEmailTemplate(null);
                  }}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded font-medium hover:bg-primary-hover"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log (Admin Only) */}
      {can('userManagement') && (
        <section id="audit-log-section" className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h3 className="text-[14px] font-semibold text-on-surface">Audit Log</h3>
            </div>
            <input
              type="text"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="Filter logs..."
              className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-[12px] focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
          
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center p-8 text-on-surface-variant text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-[13px]">
                {logFilter ? 'No matching logs found' : 'No audit logs yet'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-surface-dim">
                    <tr className="border-b border-outline-variant">
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Time</th>
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">User</th>
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Action</th>
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Entity</th>
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Details</th>
                      <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => (
                      <tr key={i} className="border-b border-outline-variant/50 hover:bg-surface-dim/50">
                        <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-on-surface">{log.user || '-'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            (log.action || '').includes('DELETE') ? 'bg-red-50 text-red-700' :
                            (log.action || '').includes('APPROVE') ? 'bg-green-50 text-green-700' :
                            (log.action || '').includes('REJECT') ? 'bg-orange-50 text-orange-700' :
                            (log.action || '').includes('LOGIN') ? 'bg-blue-50 text-blue-700' :
                            (log.action || '').includes('REGISTER') ? 'bg-purple-50 text-purple-700' :
                            'bg-surface-container text-on-surface-variant'
                          }`}>
                            {log.action || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-on-surface-variant">
                          {log.entity}{log.entityId ? ` #${log.entityId}` : ''}
                        </td>
                        <td className="px-3 py-1.5 text-on-surface-variant">
                          {log.field && (
                            <span>
                              {log.field}: <span className="line-through text-red-500">{log.oldValue}</span> → <span className="text-green-600">{log.newValue}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-on-surface-variant max-w-[200px] truncate">
                          {log.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant">
            Showing {filteredLogs.length} of {auditLogs.length} entries
          </p>
        </section>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="text-[14px] font-semibold text-on-surface">Create New User</h3>
              <button onClick={() => setShowCreateUser(false)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant">
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.username || !newUser.email || !newUser.password || isCreatingUser}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="text-[14px] font-semibold text-on-surface">Edit User: {editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={isEditingUser}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isEditingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
