import React from 'react';
import { X } from 'lucide-react';

interface SettingsModalsProps {
  // Company edit modal
  editingCompany: 'TA' | 'MM' | null;
  onCloseCompanyEdit: () => void;
  onSaveCompanyEdit: () => void;
  tempEmail: string;
  onTempEmailChange: (v: string) => void;
  tempAddress: string;
  onTempAddressChange: (v: string) => void;
  tempVat: string;
  onTempVatChange: (v: string) => void;
  tempPhone: string;
  onTempPhoneChange: (v: string) => void;
  tempCurrency: string;
  onTempCurrencyChange: (v: string) => void;
  tempTaxRate: string;
  onTempTaxRateChange: (v: string) => void;
  // WhatsApp edit modal
  editingWhatsApp: boolean;
  onCloseWhatsApp: () => void;
  onSaveWhatsApp: () => void;
  tempWhatsApp: string;
  onTempWhatsAppChange: (v: string) => void;
  // Email template modal
  editingEmailTemplate: 'orderConfirmation' | 'weeklySummary' | 'invoice' | null;
  onCloseEmailTemplate: () => void;
  onSaveEmailTemplate: () => void;
  tempEmailTemplate: string;
  onTempEmailTemplateChange: (v: string) => void;
}

export default function SettingsModals({
  editingCompany, onCloseCompanyEdit, onSaveCompanyEdit,
  tempEmail, onTempEmailChange, tempAddress, onTempAddressChange,
  tempVat, onTempVatChange, tempPhone, onTempPhoneChange,
  tempCurrency, onTempCurrencyChange, tempTaxRate, onTempTaxRateChange,
  editingWhatsApp, onCloseWhatsApp, onSaveWhatsApp,
  tempWhatsApp, onTempWhatsAppChange,
  editingEmailTemplate, onCloseEmailTemplate, onSaveEmailTemplate,
  tempEmailTemplate, onTempEmailTemplateChange
}: SettingsModalsProps) {
  return (
    <>
      {editingCompany && (
        <div id="company-edit-modal-backdrop" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div id="company-edit-modal" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-md w-full shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-[14px] font-semibold text-primary">
                Edit {editingCompany === 'TA' ? 'Transport Action' : 'Movie Motion'}
              </h3>
              <button onClick={onCloseCompanyEdit} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px] overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Contact Email</label>
                <input 
                  type="email"
                  value={tempEmail}
                  onChange={(e) => onTempEmailChange(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Address</label>
                <input 
                  type="text"
                  value={tempAddress}
                  onChange={(e) => onTempAddressChange(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">VAT / Tax ID</label>
                  <input 
                    type="text"
                    value={tempVat}
                    onChange={(e) => onTempVatChange(e.target.value)}
                    placeholder="IT12345678901"
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Phone</label>
                  <input 
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => onTempPhoneChange(e.target.value)}
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
                    onChange={(e) => onTempCurrencyChange(e.target.value)}
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
                    onChange={(e) => onTempTaxRateChange(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1 shrink-0">
                <button 
                  onClick={onCloseCompanyEdit}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={onSaveCompanyEdit}
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
          <div id="whatsapp-edit-modal" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-lg w-full shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-[14px] font-semibold text-emerald-600">
                WhatsApp Template
              </h3>
              <button onClick={onCloseWhatsApp} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px] overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Template</label>
                <textarea 
                  rows={4}
                  value={tempWhatsApp}
                  onChange={(e) => onTempWhatsAppChange(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-emerald-600 font-mono text-[11px] leading-relaxed outline-none"
                />
                <span className="text-on-surface-variant text-[10px] mt-1 block">
                  Variables: <code>[Driver_Name]</code>, <code>[Project_ID]</code>, <code>[Pickup_Time]</code>, <code>[Dropoff_Location]</code>, <code>[Link]</code>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1 shrink-0">
                <button 
                  onClick={onCloseWhatsApp}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={onSaveWhatsApp}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingEmailTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 max-w-lg w-full shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-[14px] font-semibold text-primary">
                {editingEmailTemplate === 'orderConfirmation' && 'Order Confirmation Template'}
                {editingEmailTemplate === 'weeklySummary' && 'Weekly Summary Template'}
                {editingEmailTemplate === 'invoice' && 'Invoice Template'}
              </h3>
              <button onClick={onCloseEmailTemplate} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[12px] overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1 uppercase text-[11px]">Email Body</label>
                <textarea 
                  rows={8}
                  value={tempEmailTemplate}
                  onChange={(e) => onTempEmailTemplateChange(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant rounded px-2 py-1.5 focus:border-primary font-mono text-[11px] leading-relaxed outline-none resize-none"
                />
                <span className="text-on-surface-variant text-[10px] mt-1 block">
                  Variables: <code>[Client_Name]</code>, <code>[Driver_Name]</code>, <code>[Vehicle_Type]</code>, <code>[Pickup_Time]</code>, <code>[Pickup_Location]</code>, <code>[Dropoff_Location]</code>, <code>[PO_Number]</code>, <code>[Production]</code>, <code>[Date_Range]</code>, <code>[Total_Services]</code>, <code>[Completed]</code>, <code>[Cancelled]</code>, <code>[Total_Amount]</code>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1 shrink-0">
                <button 
                  onClick={onCloseEmailTemplate}
                  className="px-3 py-1.5 bg-surface-dim hover:bg-surface-container text-on-surface rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={onSaveEmailTemplate}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded font-medium hover:bg-primary-hover"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
