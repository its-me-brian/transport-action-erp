import React, { useState } from 'react';
import { History, FileCheck, Send } from 'lucide-react';
import { ScreenId } from '../types';
import DriverReportScreen from './DriverReportScreen';
import DriverSubmissionsScreen from './DriverSubmissionsScreen';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

type HistoryTab = 'reports' | 'submissions';

const SUB_TABS: { id: HistoryTab; label: string; icon: React.ElementType }[] = [
  { id: 'reports',     label: 'Reports',     icon: FileCheck },
  { id: 'submissions', label: 'Submissions', icon: Send },
];

export default function HistoryScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('reports');

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-outline-variant">
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4">
          <History className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-on-surface">History</h1>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar px-2 sm:px-4">
          {SUB_TABS.map(tab => {
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

      <div className="flex-1 overflow-auto">
        {activeTab === 'reports' && <DriverReportScreen onNavigate={onNavigate} />}
        {activeTab === 'submissions' && <DriverSubmissionsScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
