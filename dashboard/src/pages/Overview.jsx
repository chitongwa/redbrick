import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import { users, loans, transactions } from '../data/mock';

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

    return {
      totalUsers,
      activeLoans,
      overdueLoans,
      repaymentRate,
      totalDisbursed,
      avgCreditLimit,
      monthlyDisbursements,
      recentLoans,
    };
  }, []);
}

// ── Page component ──────────────────────────────────────────────────────────

export default function Overview() {
  const s = useOverviewStats();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-navy-700">Overview</h1>

      {/* Stat cards — 6 cards in a 3×2 grid on large screens */}
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
          value={`ZMW ${s.totalDisbursed.toLocaleString()}`}
        />
        <StatCard
          label="Overdue Loans"
          value={s.overdueLoans}
          color="text-red-600"
          sub="Past due date, not yet repaid"
        />
        <StatCard
          label="Avg Credit Limit"
          value={`ZMW ${s.avgCreditLimit.toLocaleString()}`}
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
                formatter={(value) => [`ZMW ${value.toLocaleString()}`, 'Disbursed']}
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
          Total across last 6 months: ZMW{' '}
          {s.monthlyDisbursements.reduce((sum, m) => sum + m.amount, 0).toLocaleString()}
        </p>
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
                  <td className="px-5 py-3 text-right font-semibold">ZMW {l.amount}</td>
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
