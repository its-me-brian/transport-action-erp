import React, { useState } from 'react';
import { ClipboardCheck, Inbox, FileCheck, Send, MessageSquare } from 'lucide-react';
import { ScreenId } from '../types';
import ReportInboxScreen from './ReportInboxScreen';
import DriverReportScreen from './DriverReportScreen';
import DriverSubmissionsScreen from './DriverSubmissionsScreen';
import WhatsAppCaptureScreen from './WhatsAppCaptureScreen';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

type ReportsTab = 'inbox' | 'reports' | 'submissions' | 'whatsapp';

const TABS: { id: ReportsTab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox',        label: 'Inbox',        icon: Inbox },
  { id: 'reports',      label: 'Reports',      icon: FileCheck },
  { id: 'submissions',  label: 'Submissions',  icon: Send },
  { id: 'whatsapp',     label: 'WhatsApp',     icon: MessageSquare },
];

export default function DriverReportsScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<ReportsTab>('inbox');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-outline-variant">
        <ClipboardCheck className="w-5 h-5 text-primary mr-2" />
        <h1 className="text-lg font-bold text-on-surface mr-6">Driver Reports</h1>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inbox' && <ReportInboxScreen onNavigate={onNavigate} />}
        {activeTab === 'reports' && <DriverReportScreen onNavigate={onNavigate} />}
        {activeTab === 'submissions' && <DriverSubmissionsScreen onNavigate={onNavigate} />}
        {activeTab === 'whatsapp' && <WhatsAppCaptureScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
