import React from 'react';
import { MessageSquare, CheckCircle, Mail, ChevronRight, Link as LinkIcon } from 'lucide-react';

interface IntegrationSettingsSectionProps {
  whatsappTemplate: string;
  onConfigureWhatsApp: () => void;
  emailTemplates: {
    orderConfirmation: string;
    weeklySummary: string;
    invoice: string;
  };
  onEditEmailTemplate: (key: 'orderConfirmation' | 'weeklySummary' | 'invoice', template: string) => void;
}

export default function IntegrationSettingsSection({
  whatsappTemplate,
  onConfigureWhatsApp,
  emailTemplates,
  onEditEmailTemplate
}: IntegrationSettingsSectionProps) {
  return (
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
            onClick={onConfigureWhatsApp}
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
              onClick={() => onEditEmailTemplate('orderConfirmation', emailTemplates.orderConfirmation)}
              className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium"
            >
              <span>Order Confirmation PDF</span>
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
            </div>
            <div 
              onClick={() => onEditEmailTemplate('weeklySummary', emailTemplates.weeklySummary)}
              className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium"
            >
              <span>Weekly Summary Report</span>
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
            </div>
            <div 
              onClick={() => onEditEmailTemplate('invoice', emailTemplates.invoice)}
              className="flex items-center justify-between p-2 hover:bg-surface-dim/50 rounded cursor-pointer transition-colors text-on-surface font-medium text-primary"
            >
              <span>Invoice Generation (Stripe)</span>
              <LinkIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
