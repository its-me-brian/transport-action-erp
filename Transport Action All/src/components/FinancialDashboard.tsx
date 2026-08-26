import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Wallet, Receipt, 
  CreditCard, FileText,
  BarChart3, PieChart, TrendingUp, TrendingDown,
  Building2, Users, ArrowRightLeft
} from 'lucide-react';
import { ScreenId } from '../types';
import { Skeleton } from './ui/Skeleton';
import { 
  getPayments, Payment,
  getExpenses, ExpenseDTO,
  getRapportinoClients,
  getRapportinoDrivers,
  RapportinoClientDTO,
  RapportinoDriverDTO,
  getProjects, Project,
  getEstimatedVsActual,
  getProfitByProject,
  getProfitByDriver,
  getProfitByCompany,
  getCashFlow,
  getDrivers
} from '../services/api';

interface Props { onNavigate: (screen: ScreenId) => void; }

export default function FinancialDashboard({ onNavigate }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [clientRapportinos, setClientRapportinos] = useState<RapportinoClientDTO[]>([]);
  const [driverRapportinos, setDriverRapportinos] = useState<RapportinoDriverDTO[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [estimatedVsActual, setEstimatedVsActual] = useState<any>(null);
  const [profitByProject, setProfitByProject] = useState<any>(null);
  const [profitByDriver, setProfitByDriver] = useState<any>(null);
  const [profitByCompany, setProfitByCompany] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [loadingEvA, setLoadingEvA] = useState(false);
  const [loadingProfit, setLoadingProfit] = useState(false);
  const [loadingCashFlow, setLoadingCashFlow] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [payR, expR, clientRaps, driverRaps, projR, drvR] = await Promise.all([
        getPayments(),
        getExpenses(),
        getRapportinoClients().catch(() => []),
        getRapportinoDrivers().catch(() => []),
        getProjects().catch(() => []),
        getDrivers().catch(() => [])
      ]);
      if (Array.isArray(payR)) setPayments(payR);
      setExpenses(expR || []);
      setClientRapportinos(clientRaps || []);
      setDriverRapportinos(driverRaps || []);
      if (Array.isArray(projR)) setProjects(projR);
      if (Array.isArray(drvR)) setDrivers(drvR);
    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally { setIsLoading(false); }
  };

  const loadEstimatedVsActual = async (projectId: string) => {
    if (!projectId) { setEstimatedVsActual(null); return; }
    setLoadingEvA(true);
    try {
      const result = await getEstimatedVsActual(projectId);
      setEstimatedVsActual(result);
    } catch (err) {
      console.error('Error loading estimated vs actual:', err);
      setEstimatedVsActual(null);
    } finally { setLoadingEvA(false); }
  };

  useEffect(() => {
    if (selectedProjectId) loadEstimatedVsActual(selectedProjectId);
    else setEstimatedVsActual(null);
  }, [selectedProjectId]);

  const loadProfitByProject = async (projectId: string) => {
    if (!projectId) { setProfitByProject(null); return; }
    setLoadingProfit(true);
    try {
      const result = await getProfitByProject(projectId);
      setProfitByProject(result);
    } catch (err) {
      console.error('Error loading profit by project:', err);
      setProfitByProject(null);
    } finally { setLoadingProfit(false); }
  };

  const loadProfitByDriver = async (driverId: string) => {
    if (!driverId) { setProfitByDriver(null); return; }
    setLoadingProfit(true);
    try {
      const result = await getProfitByDriver(driverId);
      setProfitByDriver(result);
    } catch (err) {
      console.error('Error loading profit by driver:', err);
      setProfitByDriver(null);
    } finally { setLoadingProfit(false); }
  };

  const loadProfitByCompany = async (company: string) => {
    if (!company) { setProfitByCompany(null); return; }
    setLoadingProfit(true);
    try {
      const result = await getProfitByCompany(company);
      setProfitByCompany(result);
    } catch (err) {
      console.error('Error loading profit by company:', err);
      setProfitByCompany(null);
    } finally { setLoadingProfit(false); }
  };

  const loadCashFlow = async () => {
    setLoadingCashFlow(true);
    try {
      const result = await getCashFlow();
      setCashFlow(result);
    } catch (err) {
      console.error('Error loading cash flow:', err);
      setCashFlow(null);
    } finally { setLoadingCashFlow(false); }
  };

  useEffect(() => { loadCashFlow(); }, []);

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

  // KPIs
  const totalPayments = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalConfirmedExpenses = expenses
    .filter(e => e.status === 'confirmed')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalPendingExpenses = expenses
    .filter(e => e.status === 'draft')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = totalPayments - totalConfirmedExpenses;
  // Client rapportinos: not yet facturado = pending
  const pendingClientRapportinos = clientRapportinos.filter(r => r.status !== 'Facturado').length;
  // Driver rapportinos: not yet pagado = pending
  const pendingDriverRapportinos = driverRapportinos.filter(r => r.status !== 'Pagado').length;
  const pendingRapportinos = pendingClientRapportinos + pendingDriverRapportinos;

  const kpis = [
    { label: 'Total Received', value: fmt(totalPayments), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Confirmed Expenses', value: fmt(totalConfirmedExpenses), icon: Receipt, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Balance', value: fmt(balance), icon: Wallet, color: balance >= 0 ? 'text-blue-600' : 'text-amber-600', bg: balance >= 0 ? 'bg-blue-50' : 'bg-amber-50', border: balance >= 0 ? 'border-blue-200' : 'border-amber-200' },
    { label: 'Pending Rapportinos', value: String(pendingRapportinos), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
  ];

  const quickLinks = [
    { label: 'Payments', screen: 'payments' as ScreenId, icon: CreditCard, color: 'text-emerald-500' },
    { label: 'Expenses', screen: 'expenses' as ScreenId, icon: Receipt, color: 'text-red-500' },
    { label: 'Rapportinos', screen: 'rapportinos' as ScreenId, icon: FileText, color: 'text-purple-500' },
    { label: 'Invoices', screen: 'invoices' as ScreenId, icon: FileText, color: 'text-blue-500' },
    { label: 'Projects', screen: 'projects' as ScreenId, icon: BarChart3, color: 'text-amber-500' },
    { label: 'Reports', screen: 'reports' as ScreenId, icon: PieChart, color: 'text-teal-500' }
  ];

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Financial Overview</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{pendingRapportinos} unpaid rapportino{pendingRapportinos !== 1 ? 's' : ''}</p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4" role="status">
          <span className="sr-only">Loading financial data...</span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-outline-variant/30 p-4 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-outline-variant/30 p-4 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-40 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className={`${kpi.bg} border ${kpi.border} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-[11px] text-on-surface-variant uppercase tracking-wide">{kpi.label}</span>
                  </div>
                  <p className={`text-[18px] font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="text-[13px] font-semibold text-on-surface mb-2">Quick Access</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {quickLinks.map((link, i) => {
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

          {/* Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Recent Payments */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <h3 className="text-[13px] font-semibold text-on-surface mb-3">Recent Payments</h3>
              {payments.length === 0 ? (
                <p className="text-[12px] text-on-surface-variant">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-on-surface truncate">{p.clientName}</span>
                      <span className="text-emerald-600 font-semibold">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Expenses */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <h3 className="text-[13px] font-semibold text-on-surface mb-3">Recent Expenses</h3>
              {expenses.length === 0 ? (
                <p className="text-[12px] text-on-surface-variant">No expenses recorded</p>
              ) : (
                <div className="space-y-2">
                  {expenses.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-on-surface truncate">{e.description}</span>
                      <span className="text-red-500 font-semibold">{fmt(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estimated vs Actual */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-on-surface">Estimated vs Actual</h3>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="text-[11px] border border-outline-variant rounded-lg px-2 py-1 bg-surface-container-lowest text-on-surface cursor-pointer"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {!selectedProjectId ? (
              <p className="text-[12px] text-on-surface-variant">Select a project to compare estimated vs actual</p>
            ) : loadingEvA ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container rounded-lg p-3 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                ))}
              </div>
            ) : estimatedVsActual ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                  <div className="bg-surface-container rounded-lg p-3">
                    <span className="text-on-surface-variant text-[10px] uppercase">Revenue</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Est.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.estimated.revenue)}</p>
                      </div>
                      <span className="text-on-surface-variant">→</span>
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Act.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.actual.revenue)}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${estimatedVsActual.variance.revenuePercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {estimatedVsActual.variance.revenuePercent >= 0 ? '+' : ''}{estimatedVsActual.variance.revenuePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-surface-container rounded-lg p-3">
                    <span className="text-on-surface-variant text-[10px] uppercase">Cost</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Est.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.estimated.cost)}</p>
                      </div>
                      <span className="text-on-surface-variant">→</span>
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Act.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.actual.cost)}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${estimatedVsActual.variance.costPercent <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {estimatedVsActual.variance.costPercent >= 0 ? '+' : ''}{estimatedVsActual.variance.costPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-surface-container rounded-lg p-3">
                    <span className="text-on-surface-variant text-[10px] uppercase">Profit</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Est.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.estimated.profit)}</p>
                      </div>
                      <span className="text-on-surface-variant">→</span>
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Act.</span>
                        <p className="font-semibold text-on-surface">{fmt(estimatedVsActual.actual.profit)}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${estimatedVsActual.variance.profitPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {estimatedVsActual.variance.profitPercent >= 0 ? '+' : ''}{estimatedVsActual.variance.profitPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-on-surface-variant text-center">
                  {estimatedVsActual.serviceCount} services · Margin: {estimatedVsActual.estimated.margin.toFixed(1)}% est. → {estimatedVsActual.actual.margin.toFixed(1)}% actual
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-on-surface-variant">No data available</p>
            )}
          </div>

          {/* Cash Flow Summary */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <h3 className="text-[13px] font-semibold text-on-surface">Cash Flow</h3>
            </div>
            {loadingCashFlow ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container rounded-lg p-3 space-y-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : cashFlow ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <span className="text-emerald-700 text-[10px] uppercase">Income</span>
                  <p className="font-bold text-emerald-600">{fmt(cashFlow.summary.totalIncome)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-red-700 text-[10px] uppercase">Expenses</span>
                  <p className="font-bold text-red-500">{fmt(cashFlow.summary.totalExpense)}</p>
                </div>
                <div className={`${cashFlow.summary.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3`}>
                  <span className={`${cashFlow.summary.balance >= 0 ? 'text-blue-700' : 'text-amber-700'} text-[10px] uppercase`}>Balance</span>
                  <p className={`font-bold ${cashFlow.summary.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(cashFlow.summary.balance)}</p>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-on-surface-variant">No cash flow data</p>
            )}
          </div>

          {/* Profit Analysis */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[13px] font-semibold text-on-surface">Profit Analysis</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* By Project */}
              <div className="space-y-2">
                <label className="text-[11px] text-on-surface-variant uppercase">By Project</label>
                <select
                  value={selectedProjectId}
                  onChange={e => { setSelectedProjectId(e.target.value); loadProfitByProject(e.target.value); }}
                  className="w-full text-[11px] border border-outline-variant rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface cursor-pointer"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {profitByProject && (
                  <div className="bg-surface-container rounded-lg p-3 text-[11px] space-y-1">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Revenue</span><span className="font-semibold">{fmt(profitByProject.totalRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Cost</span><span className="font-semibold">{fmt(profitByProject.totalCost)}</span></div>
                    <div className="flex justify-between border-t border-outline-variant pt-1"><span className="text-on-surface-variant">Profit</span><span className={`font-bold ${profitByProject.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(profitByProject.profit)}</span></div>
                    <div className="text-center text-[10px] text-on-surface-variant">{profitByProject.serviceCount} services · {profitByProject.margin.toFixed(1)}% margin</div>
                  </div>
                )}
              </div>

              {/* By Driver */}
              <div className="space-y-2">
                <label className="text-[11px] text-on-surface-variant uppercase">By Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={e => { setSelectedDriverId(e.target.value); loadProfitByDriver(e.target.value); }}
                  className="w-full text-[11px] border border-outline-variant rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface cursor-pointer"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((d: any) => (
                    <option key={d.ID || d.id} value={d.ID || d.id}>{d.Name || d.name}</option>
                  ))}
                </select>
                {profitByDriver && (
                  <div className="bg-surface-container rounded-lg p-3 text-[11px] space-y-1">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Revenue</span><span className="font-semibold">{fmt(profitByDriver.totalRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Cost</span><span className="font-semibold">{fmt(profitByDriver.totalCost)}</span></div>
                    <div className="flex justify-between border-t border-outline-variant pt-1"><span className="text-on-surface-variant">Profit</span><span className={`font-bold ${profitByDriver.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(profitByDriver.profit)}</span></div>
                    <div className="text-center text-[10px] text-on-surface-variant">{profitByDriver.serviceCount} services · {profitByDriver.margin.toFixed(1)}% margin</div>
                  </div>
                )}
              </div>

              {/* By Company */}
              <div className="space-y-2">
                <label className="text-[11px] text-on-surface-variant uppercase">By Company</label>
                <input
                  type="text"
                  value={selectedCompany}
                  onChange={e => { setSelectedCompany(e.target.value); loadProfitByCompany(e.target.value); }}
                  placeholder="Enter company name..."
                  className="w-full text-[11px] border border-outline-variant rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface"
                />
                {profitByCompany && (
                  <div className="bg-surface-container rounded-lg p-3 text-[11px] space-y-1">
                    <div className="flex justify-between"><span className="text-on-surface-variant">Revenue</span><span className="font-semibold">{fmt(profitByCompany.totalRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-on-surface-variant">Cost</span><span className="font-semibold">{fmt(profitByCompany.totalCost)}</span></div>
                    <div className="flex justify-between border-t border-outline-variant pt-1"><span className="text-on-surface-variant">Profit</span><span className={`font-bold ${profitByCompany.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(profitByCompany.profit)}</span></div>
                    <div className="text-center text-[10px] text-on-surface-variant">{profitByCompany.serviceCount} services · {profitByCompany.margin.toFixed(1)}% margin</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
