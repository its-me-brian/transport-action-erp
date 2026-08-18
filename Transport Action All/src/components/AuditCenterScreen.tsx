import React, { useState } from 'react';
import { Shield, Activity, AlertTriangle } from 'lucide-react';
import { ScreenId } from '../types';
import ActivityFeedScreen from './ActivityFeedScreen';
import ChangesScreen from './ChangesScreen';

interface Props {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type AuditTab = 'activity' | 'changes';

const TABS: { id: AuditTab; label: string; icon: React.ElementType }[] = [
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'changes',  label: 'Changes',  icon: AlertTriangle },
];

export default function AuditCenterScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<AuditTab>('activity');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-outline-variant">
        <Shield className="w-5 h-5 text-primary mr-2" />
        <h1 className="text-lg font-bold text-on-surface mr-6">Audit Center</h1>
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
        {activeTab === 'activity' && <ActivityFeedScreen onNavigate={onNavigate} />}
        {activeTab === 'changes' && <ChangesScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
