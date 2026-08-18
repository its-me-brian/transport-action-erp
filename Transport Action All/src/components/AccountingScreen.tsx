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
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-outline-variant">
        <DollarSign className="w-5 h-5 text-primary mr-2" />
        <h1 className="text-lg font-bold text-on-surface mr-6">Accounting</h1>
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
        {activeTab === 'invoices' && <InvoiceScreen onNavigate={onNavigate} />}
        {activeTab === 'payments' && <PaymentsScreen onNavigate={onNavigate} />}
        {activeTab === 'expenses' && <ExpenseScreen onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
