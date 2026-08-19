import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, TrendingUp, TrendingDown, FileText, AlertCircle,
  CheckCircle, Clock, DollarSign, Car, Users, Loader2,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { ScreenId } from '../types';
import { 
  getMainDashboard, DashboardSummary,
  getPendingValidation, getPendingInvoicing, ServiceSummary
} from '../services/api';

interface ExecutiveDashboardScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function ExecutiveDashboardScreen({ onNavigate }: ExecutiveDashboardScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [pendingValidation, setPendingValidation] = useState<ServiceSummary[]>([]);
  const [pendingInvoicing, setPendingInvoicing] = useState<ServiceSummary[]>([]);
  const [showWorklists, setShowWorklists] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [summary, validation, invoicing] = await Promise.all([
        getMainDashboard().catch(() => null),
        getPendingValidation().catch(() => []),
        getPendingInvoicing().catch(() => [])
      ]);
      if (summary) setDashboardSummary(summary);
      if (Array.isArray(validation)) setPendingValidation(validation);
      if (Array.isArray(invoicing)) setPendingInvoicing(invoicing);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto p-4 md:p-6 h-full overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Executive Dashboard</h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Business overview and actionable items</p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {/* KPI skeleton row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-outline-variant/30 px-4 py-3 space-y-2 animate-pulse">
                <div className="h-3 bg-surface-dim rounded w-1/2" />
                <div className="h-7 bg-surface-dim rounded w-2/3" />
                <div className="h-3 bg-surface-dim rounded w-1/3" />
              </div>
            ))}
          </div>
          {/* KPI skeleton row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-outline-variant/30 px-4 py-3 space-y-2 animate-pulse">
                <div className="h-3 bg-surface-dim rounded w-1/2" />
                <div className="h-7 bg-surface-dim rounded w-2/3" />
                <div className="h-3 bg-surface-dim rounded w-1/3" />
              </div>
            ))}
          </div>
          {/* Worklist skeleton */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-outline-variant/30 px-4 py-3 space-y-2 animate-pulse">
                <div className="h-3 bg-surface-dim rounded w-1/2" />
                <div className="h-7 bg-surface-dim rounded w-1/4" />
                <div className="h-3 bg-surface-dim rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : dashboardSummary ? (
        <>
          {/* KPI Cards - Row 1: Core Financials */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {[
              { icon: BarChart3, iconColor: 'text-on-surface-variant', label: 'Total Services', value: dashboardSummary.services.total, sub: `${dashboardSummary.services.validated} validated` },
              { icon: TrendingUp, iconColor: 'text-emerald-600', label: 'Revenue', value: fmt(dashboardSummary.financials.totalRevenue), valueColor: 'text-emerald-600' },
              { icon: TrendingDown, iconColor: 'text-red-600', label: 'Cost', value: fmt(dashboardSummary.financials.totalCost), valueColor: 'text-red-600' },
              { icon: DollarSign, iconColor: dashboardSummary.financials.profit >= 0 ? 'text-emerald-600' : 'text-red-600', label: 'Profit', value: fmt(dashboardSummary.financials.profit), valueColor: dashboardSummary.financials.profit >= 0 ? 'text-emerald-600' : 'text-red-600', sub: `${dashboardSummary.financials.margin.toFixed(1)}% margin` }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3"
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">{card.label}</span>
                  </div>
                  <div className={`text-[24px] font-bold ${card.valueColor || 'text-on-surface'}`}>{card.value}</div>
                  {card.sub && <div className="text-[11px] text-on-surface-variant">{card.sub}</div>}
                </motion.div>
              );
            })}
          </motion.div>

          {/* KPI Cards - Row 2: Invoicing, Expenses, Resources */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
          >
            {[
              { icon: FileText, iconColor: 'text-on-surface-variant', label: 'Invoiced', value: fmt(dashboardSummary.invoicing.totalInvoiced), sub: `${dashboardSummary.invoicing.pending} pending` },
              { icon: CheckCircle, iconColor: 'text-emerald-600', label: 'Paid', value: fmt(dashboardSummary.invoicing.totalPaid), valueColor: 'text-emerald-600', sub: `${fmt(dashboardSummary.invoicing.pendingAmount)} pending` },
              { icon: AlertCircle, iconColor: 'text-red-600', label: 'Expenses', value: fmt(dashboardSummary.expenses.total), valueColor: 'text-red-600' },
              { icon: Users, iconColor: 'text-on-surface-variant', label: 'Resources', value: `${dashboardSummary.resources.drivers.available}/${dashboardSummary.resources.drivers.total} drivers`, valueSize: 'text-[16px]', sub: `${dashboardSummary.resources.vehicles.available}/${dashboardSummary.resources.vehicles.total} vehicles` }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3"
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">{card.label}</span>
                  </div>
                  <div className={`${card.valueSize || 'text-[24px]'} font-bold ${card.valueColor || 'text-on-surface'}`}>{card.value}</div>
                  {card.sub && <div className="text-[11px] text-on-surface-variant">{card.sub}</div>}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Actionable Worklist Counts */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div 
              className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => setShowWorklists(!showWorklists)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-700 uppercase tracking-wide">Pending Validation</div>
                  <div className="text-[24px] font-bold text-amber-700">{dashboardSummary.services.pendingValidation}</div>
                  <div className="text-[11px] text-amber-600">services need review</div>
                </div>
                {showWorklists ? <ChevronDown className="w-5 h-5 text-amber-600" /> : <ChevronRight className="w-5 h-5 text-amber-600" />}
              </div>
            </div>
            <div 
              className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => setShowWorklists(!showWorklists)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-blue-700 uppercase tracking-wide">Ready to Invoice</div>
                  <div className="text-[24px] font-bold text-blue-700">{dashboardSummary.invoicing.sent}</div>
                  <div className="text-[11px] text-blue-600">invoices sent, awaiting payment</div>
                </div>
                {showWorklists ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
              </div>
            </div>
          </div>

          {/* Expanded Worklists */}
          {showWorklists && (pendingValidation.length > 0 || pendingInvoicing.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              {pendingValidation.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-2">Pending Validation</div>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {pendingValidation.slice(0, 10).map(s => (
                      <div key={s.serviceId} className="flex items-center justify-between text-[11px] bg-white/60 rounded px-2 py-1.5">
                        <span className="text-on-surface font-medium truncate">{s.serviceId}</span>
                        <span className="text-amber-700">{s.driver || 'Unassigned'}</span>
                      </div>
                    ))}
                  </div>
                  {pendingValidation.length > 10 && (
                    <div className="text-[10px] text-amber-600 mt-2">+{pendingValidation.length - 10} more</div>
                  )}
                  <button
                    onClick={() => onNavigate('transport')}
                    className="mt-2 text-[11px] text-amber-700 font-medium hover:underline cursor-pointer"
                  >
                    View in Calendar →
                  </button>
                </div>
              )}
              {pendingInvoicing.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide mb-2">Ready to Invoice</div>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {pendingInvoicing.slice(0, 10).map(s => (
                      <div key={s.serviceId} className="flex items-center justify-between text-[11px] bg-white/60 rounded px-2 py-1.5">
                        <span className="text-on-surface font-medium truncate">{s.serviceId}</span>
                        <span className="text-blue-700">{fmt(s.revenue)}</span>
                      </div>
                    ))}
                  </div>
                  {pendingInvoicing.length > 10 && (
                    <div className="text-[10px] text-blue-600 mt-2">+{pendingInvoicing.length - 10} more</div>
                  )}
                  <button
                    onClick={() => onNavigate('accounting')}
                    className="mt-2 text-[11px] text-blue-700 font-medium hover:underline cursor-pointer"
                  >
                    View Accounting →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Navigation */}
          <div className="shrink-0">
            <h3 className="text-[13px] font-semibold text-on-surface mb-3">Quick Access</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: 'Transport', screen: 'transport' as ScreenId, icon: Clock, color: 'text-primary' },
                { label: 'Rapportinos', screen: 'rapportinos' as ScreenId, icon: FileText, color: 'text-purple-600' },
                { label: 'Accounting', screen: 'accounting' as ScreenId, icon: DollarSign, color: 'text-emerald-600' },
                { label: 'Projects', screen: 'projects' as ScreenId, icon: BarChart3, color: 'text-amber-600' },
                { label: 'Drivers', screen: 'drivers' as ScreenId, icon: Users, color: 'text-blue-600' },
                { label: 'Reports', screen: 'financial' as ScreenId, icon: TrendingUp, color: 'text-teal-600' }
              ].map((link, i) => {
                const Icon = link.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onNavigate(link.screen)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-surface-container-lowest border border-outline-variant rounded-lg hover:bg-surface-dim/50 transition-colors cursor-pointer"
                  >
                    <Icon className={`w-5 h-5 ${link.color}`} />
                    <span className="text-[11px] text-on-surface font-medium">{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-on-surface-variant" />
          <span className="text-[13px] text-on-surface-variant">No dashboard data available</span>
        </div>
      )}
    </div>
  );
}
