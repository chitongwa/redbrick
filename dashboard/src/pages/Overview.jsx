import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import {
  users, loans, transactions,
  tradeCreditOrders, floatBalance, graduationQueue, frozenAccounts,
} from '../data/mock';
import { zmw, num } from '../utils/fmt';

// ── Compute all stats from raw data ────────────────────────────────────────

function useOverviewStats() {
  return useMemo(() => {
    // 1. Total registered users
    const totalUsers = users.length;

    // 2. Active loans
    const activeLoans = loans.filter(l => l.status === 'active').length;

    // 3. Overdue loans
    const overdueLoans = loans.filter(l => l.status === 'overdue').length;

    // 4. Repayment rate — repaid / (repaid + overdue + defaulted)
    const repaid    = loans.filter(l => l.status === 'repaid').length;
    const matured   = repaid
                    + loans.filter(l => l.status === 'defaulted').length
                    + loans.filter(l => l.status === 'overdue').length;
    const repaymentRate = matured > 0 ? +((repaid / matured) * 100).toFixed(1) : 0;

    // 5. Total credit disbursed
    const totalDisbursed = loans.reduce((sum, l) => sum + l.amount, 0);

    // 6. Average credit limit (from transaction history, same logic as scorer)
    const avgCreditLimit = (() => {
      const limits = users.map(u => {
        const userTxs = transactions.filter(t => t.user_id === u.id);
        const months = new Map();
        for (const t of userTxs) {
          const key = t.purchased_at.slice(0, 7);
          months.set(key, (months.get(key) || 0) + t.amount_zmw);
        }
        if (months.size < 3) return 20;
        const avg = [...months.values()].reduce((a, b) => a + b, 0) / months.size;
        return Math.min(500, Math.max(20, Math.round(avg * 0.5)));
      });
      return limits.length > 0
        ? Math.round(limits.reduce((a, b) => a + b, 0) / limits.length)
        : 0;
    })();

    // 7. Monthly loan disbursements — last 6 months
    const now = new Date();
    const monthlyDisbursements = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleDateString('en-ZM', { month: 'short', year: '2-digit' });
      const total = loans
        .filter(l => l.created_at.startsWith(key))
        .reduce((sum, l) => sum + l.amount, 0);
      monthlyDisbursements.push({ month: label, amount: total });
    }

    // 8. Recent loans (5 most recent by created_at)
    const recentLoans = [...loans]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);

    // ── Portfolio Health stats ──────────────────────────────────────────────

    // 9. Loan status breakdown for donut chart
    const statusBreakdown = [
      { name: 'Repaid',    value: repaid,                                            fill: '#22c55e' },
      { name: 'Active',    value: activeLoans,                                       fill: '#3b82f6' },
      { name: 'Overdue',   value: overdueLoans,                                      fill: '#f97316' },
      { name: 'Defaulted', value: loans.filter(l => l.status === 'defaulted').length, fill: '#ef4444' },
    ];

    // 10. Cumulative repayments over last 6 months
    const repaidLoans = loans.filter(l => l.status === 'repaid' && l.repaid_at);
    const cumulativeRepayments = [];
    let cumulative = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-ZM', { month: 'short', year: '2-digit' });
      const monthTotal = repaidLoans
        .filter(l => l.repaid_at.startsWith(key))
        .reduce((sum, l) => sum + l.amount, 0);
      cumulative += monthTotal;
      cumulativeRepayments.push({ month: label, cumulative, monthAmount: monthTotal });
    }

    // 11. Default rate
    const defaulted = loans.filter(l => l.status === 'defaulted').length;
    const defaultRate = matured > 0 ? +((defaulted / matured) * 100).toFixed(1) : 0;

    // 12. Average days to repayment (for repaid loans)
    const daysToRepay = repaidLoans.map(l => {
      const start = new Date(l.created_at);
      const end   = new Date(l.repaid_at);
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    });
    const avgDaysToRepay = daysToRepay.length > 0
      ? Math.round(daysToRepay.reduce((a, b) => a + b, 0) / daysToRepay.length)
      : 0;

    // ── Tier & Trade Credit stats ──────────────────────────────────────────
    const tier1Users = users.filter(u => u.tier === 'trade_credit').length;
    const tier2Users = users.filter(u => u.tier === 'loan_credit').length;

    // Today = 2026-04-08 per the mock data
    const today = '2026-04-08';

    // Trade credit transactions today (any order created_at today, any status)
    const tcToday = tradeCreditOrders.filter(o => o.created_at.startsWith(today));
    const tcTxCountToday = tcToday.length;

    // Trade credit fees collected today (sum of service_fee for paid orders)
    const tcFeesToday = tcToday
      .filter(o => o.status === 'paid')
      .reduce((sum, o) => sum + (o.service_fee || 0), 0);

    // Outstanding unpaid trade credit (total ZMW owed across pending/overdue/frozen)
    const outstandingTradeCredit = tradeCreditOrders
      .filter(o => ['token_delivered', 'overdue', 'frozen'].includes(o.status))
      .reduce((sum, o) => sum + (o.total_due || 0), 0);

    // Frozen accounts
    const frozenCount = frozenAccounts.length;

    // Pending graduation approvals
    const pendingGraduations = graduationQueue.filter(g => g.status === 'pending').length;

    // Float balance with colour band
    const floatUnits = floatBalance.total_units;
    const floatColor = floatUnits > 10000 ? 'text-green-600'
                     : floatUnits >= 1000 ? 'text-orange-500'
                     : 'text-red-600';
    const floatBand = floatUnits > 10000 ? 'Healthy'
                    : floatUnits >= 1000 ? 'Replenish soon'
                    : 'CRITICAL — buy now';

    return {
      totalUsers,
      activeLoans,
      overdueLoans,
      repaymentRate,
      totalDisbursed,
      avgCreditLimit,
      monthlyDisbursements,
      recentLoans,
      statusBreakdown,
      cumulativeRepayments,
      defaultRate,
      avgDaysToRepay,
      // New tier/trade credit stats
      tier1Users,
      tier2Users,
      tcTxCountToday,
      tcFeesToday,
      outstandingTradeCredit,
      frozenCount,
      pendingGraduations,
      floatUnits,
      floatValue: floatBalance.total_value_zmw,
      floatColor,
      floatBand,
    };
  }, []);
}

// ── Page component ──────────────────────────────────────────────────────────

export default function Overview() {
  const s = useOverviewStats();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-navy-700">Overview</h1>

      {/* ── Tier & Trade Credit stat cards (4 cols) ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tier 1 — Trade Credit"
          value={s.tier1Users}
          sub="Users building credit history"
          color="text-orange-600"
        />
        <StatCard
          label="Tier 2 — Credit Members"
          value={s.tier2Users}
          sub="Graduated to loan credit"
          color="text-navy-700"
        />
        <StatCard
          label="Trade Credits Today"
          value={s.tcTxCountToday}
          sub={`${tradeCreditOrders.filter(o => o.created_at.startsWith('2026-04-08') && o.status === 'paid').length} paid so far`}
        />
        <StatCard
          label="Fees Collected Today"
          value={zmw(s.tcFeesToday)}
          color="text-green-600"
          sub="4% service fee revenue"
        />
      </div>

      {/* ── Float, Outstanding, Frozen, Graduations (4 cols) ─────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Float balance with colour band */}
        <div
          onClick={() => navigate('/float')}
          className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Float Balance</p>
          <p className={`text-2xl font-bold mt-1 ${s.floatColor}`}>
            {s.floatUnits.toLocaleString()} <span className="text-sm font-semibold text-gray-400">units</span>
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">{zmw(s.floatValue)}</p>
            <span className={`text-[10px] font-bold uppercase ${s.floatColor}`}>
              {s.floatBand}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                s.floatUnits > 10000 ? 'bg-green-500'
                : s.floatUnits >= 1000 ? 'bg-orange-500'
                : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((s.floatUnits / 20000) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Outstanding trade credit */}
        <div
          onClick={() => navigate('/trade-credit')}
          className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding Trade Credit</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">
            {zmw(s.outstandingTradeCredit)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Total ZMW owed by customers
          </p>
        </div>

        {/* Frozen accounts — clickable */}
        <div
          onClick={() => navigate('/trade-credit?filter=frozen')}
          className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow border border-red-100"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Frozen Accounts</p>
          <p className={`text-2xl font-bold mt-1 ${s.frozenCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {s.frozenCount}
          </p>
          <p className="text-xs text-red-500 mt-1 font-medium">
            {s.frozenCount > 0 ? 'Click to review →' : 'All clear'}
          </p>
        </div>

        {/* Pending graduations — clickable */}
        <div
          onClick={() => navigate('/graduation')}
          className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow border border-yellow-100"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Graduations</p>
          <p className={`text-2xl font-bold mt-1 ${s.pendingGraduations > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {s.pendingGraduations}
          </p>
          <p className="text-xs text-yellow-700 mt-1 font-medium">
            {s.pendingGraduations > 0 ? 'Awaiting review →' : 'Queue empty'}
          </p>
        </div>
      </div>

      {/* ── Classic loan stats (3 col) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Users"
          value={s.totalUsers.toLocaleString()}
          sub={`${users.filter(u => u.kyc_status === 'verified').length} verified`}
        />
        <StatCard
          label="Active Loans"
          value={s.activeLoans}
          accent
        />
        <StatCard
          label="Repayment Rate"
          value={`${s.repaymentRate}%`}
          color="text-green-600"
          sub="Repaid vs matured loans"
        />
        <StatCard
          label="Total Disbursed"
          value={zmw(s.totalDisbursed)}
        />
        <StatCard
          label="Overdue Loans"
          value={s.overdueLoans}
          color="text-red-600"
          sub="Past due date, not yet repaid"
        />
        <StatCard
          label="Avg Credit Limit"
          value={zmw(s.avgCreditLimit)}
          sub="Based on ZESCO history"
        />
      </div>

      {/* Monthly disbursements bar chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-navy-700 mb-4">Monthly Loan Disbursements</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.monthlyDisbursements} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toLocaleString()}`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                }}
                formatter={(value) => [zmw(value), 'Disbursed']}
                cursor={{ fill: 'rgba(30, 58, 95, 0.05)' }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {s.monthlyDisbursements.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.amount > 0 ? '#1E3A5F' : '#d1d5db'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Total across last 6 months: {zmw(s.monthlyDisbursements.reduce((sum, m) => sum + m.amount, 0))}
        </p>
      </div>

      {/* ── Portfolio Health ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-navy-700">Portfolio Health</h2>
          <span className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Board Review
          </span>
        </div>

        {/* Top row: Donut + Line chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Donut chart — Loan status breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-navy-700 mb-1">Loan Status Breakdown</h3>
            <p className="text-xs text-gray-400 mb-4">Distribution across all {loans.length} loans</p>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={s.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {s.statusBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                    formatter={(value, name) => [`${value} loan${value !== 1 ? 's' : ''}`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line chart — Cumulative repayments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-navy-700 mb-1">Cumulative Repayments</h3>
            <p className="text-xs text-gray-400 mb-4">
              Total recovered: {zmw(s.cumulativeRepayments.at(-1)?.cumulative || 0)}
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.cumulativeRepayments} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toLocaleString()}`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                    formatter={(value, name) => [
                      zmw(value),
                      name === 'cumulative' ? 'Cumulative' : 'This Month',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    name="cumulative"
                  />
                  <Line
                    type="monotone"
                    dataKey="monthAmount"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                    name="monthAmount"
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="line"
                    formatter={(value) => (
                      <span className="text-xs text-gray-600">
                        {value === 'cumulative' ? 'Cumulative' : 'Monthly'}
                      </span>
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom row: Default rate + Avg days to repayment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Default Rate</p>
            <p className={`text-3xl font-bold mt-1 ${s.defaultRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {s.defaultRate}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {s.defaultRate > 5
                ? 'Above 5% threshold — review collection strategy'
                : 'Within acceptable range (< 5%)'}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${s.defaultRate > 5 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(s.defaultRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Days to Repayment</p>
            <p className="text-3xl font-bold mt-1 text-navy-700">
              {s.avgDaysToRepay} <span className="text-base font-medium text-gray-400">days</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Average across {loans.filter(l => l.status === 'repaid').length} repaid loans
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min((s.avgDaysToRepay / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent loans table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-700">Recent Loans</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Meter</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {s.recentLoans.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-navy-700">{l.user_name}</td>
                  <td className="px-5 py-3 text-gray-500">{l.meter}</td>
                  <td className="px-5 py-3 text-right font-semibold">{zmw(l.amount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{l.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active:    'bg-blue-50 text-blue-700',
    repaid:    'bg-green-50 text-green-700',
    overdue:   'bg-orange-50 text-orange-700',
    defaulted: 'bg-red-50 text-red-700',
    pending:   'bg-yellow-50 text-yellow-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
}
