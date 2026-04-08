import { useState } from 'react';
import { loans } from '../data/mock';
import { useCsvExport } from '../hooks/useCsvExport';

export default function Loans() {
  const [statusFilter, setStatusFilter] = useState('all');
  const exportCsv = useCsvExport();

  const filtered = loans.filter(
    (l) => statusFilter === 'all' || l.status === statusFilter
  );

  const statusCounts = loans.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-700">Loans</h1>
        <button
          onClick={() => exportCsv(filtered, 'redbrick-loans.csv')}
          className="px-4 py-2 text-sm font-medium bg-navy-600 hover:bg-navy-700 text-white rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'repaid', 'overdue', 'defaulted'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-navy-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-navy-300'
            }`}
          >
            {s === 'all' ? `All (${loans.length})` : `${s} (${statusCounts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Meter</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-left">Due</th>
                <th className="px-5 py-3 text-left">Repaid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">#{l.id}</td>
                  <td className="px-5 py-3 font-medium text-navy-700">{l.user_name}</td>
                  <td className="px-5 py-3 text-gray-500">{l.meter}</td>
                  <td className="px-5 py-3 text-right font-semibold">ZMW {l.amount}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{l.created_at}</td>
                  <td className="px-5 py-3 text-gray-400">{l.due_date}</td>
                  <td className="px-5 py-3 text-gray-400">{l.repaid_at || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    No loans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} loans</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active:    'bg-blue-50 text-blue-700',
    repaid:    'bg-green-50 text-green-700',
    overdue:   'bg-orange-50 text-orange-700',
    defaulted: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-50'}`}>
      {status}
    </span>
  );
}
