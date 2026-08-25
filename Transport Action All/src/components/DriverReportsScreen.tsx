import React, { useState } from 'react';
import { ClipboardCheck, Inbox, History, MessageSquare } from 'lucide-react';
import { ScreenId } from '../types';
import ReportInboxScreen from './ReportInboxScreen';
import HistoryScreen from './HistoryScreen';
import WhatsAppCaptureScreen from './WhatsAppCaptureScreen';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

type ReportsTab = 'inbox' | 'history' | 'import';

const TABS: { id: ReportsTab; label: string; icon: React.ElementType }[] = [
  { id: 'inbox',    label: 'Inbox',    icon: Inbox },
  { id: 'history',  label: 'History',  icon: History },
  { id: 'import',   label: 'Import',   icon: MessageSquare },
];

export default function DriverReportsScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<ReportsTab>('inbox');

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-outline-variant">
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4">
          <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-on-surface">Driver Reports</h1>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar px-2 sm:px-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0 ${
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
      </div>

      <div className="flex-1 overflow-auto pb-24">
        {activeTab === 'inbox' && <ReportInboxScreen onNavigate={onNavigate} />}
        {activeTab === 'history' && <HistoryScreen onNavigate={onNavigate} />}
        {activeTab === 'import' && <WhatsAppCaptureScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
