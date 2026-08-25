import React, { useState } from 'react';
import { DollarSign, FileText, Receipt, CreditCard } from 'lucide-react';
import { ScreenId } from '../types';
import InvoiceScreen from './InvoiceScreen';
import PaymentsScreen from './PaymentsScreen';
import ExpenseScreen from './ExpenseScreen';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

type AccountingTab = 'invoices' | 'payments' | 'expenses';

const TABS: { id: AccountingTab; label: string; icon: React.ElementType }[] = [
  { id: 'invoices',  label: 'Invoices',  icon: FileText },
  { id: 'payments',  label: 'Payments',  icon: CreditCard },
  { id: 'expenses',  label: 'Expenses',  icon: Receipt },
];

export default function AccountingScreen({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<AccountingTab>('invoices');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-outline-variant">
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4">
          <DollarSign className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-on-surface">Accounting</h1>
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

      {/* Tab content */}
      <div className="flex-1 overflow-auto pb-24">
        {activeTab === 'invoices' && <InvoiceScreen onNavigate={onNavigate} />}
        {activeTab === 'payments' && <PaymentsScreen onNavigate={onNavigate} />}
        {activeTab === 'expenses' && <ExpenseScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
