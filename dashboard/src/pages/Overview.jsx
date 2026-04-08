import StatCard from '../components/StatCard';
import { stats, loans } from '../data/mock';

export default function Overview() {
  const recentLoans = loans.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-navy-700">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
        <StatCard label="Active Loans" value={stats.activeLoans} accent />
        <StatCard label="Repayment Rate" value={`${stats.repaymentRate}%`} sub="Last 30 days" />
        <StatCard label="Total Disbursed" value={`ZMW ${stats.totalDisbursed.toLocaleString()}`} />
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
              {recentLoans.map((l) => (
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
