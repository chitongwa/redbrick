import { useState, useMemo } from 'react';
import { loans } from '../data/mock';
import { useCsvExport } from '../hooks/useCsvExport';

const STATUS_ORDER = ['all', 'active', 'repaid', 'overdue', 'defaulted'];

const CHIP_DOT = {
  all:       'bg-navy-500',
  active:    'bg-blue-500',
  repaid:    'bg-green-500',
  overdue:   'bg-orange-500',
  defaulted: 'bg-red-500',
};

const METHOD_LABEL = {
  mtn:    'MTN MoMo',
  airtel: 'Airtel Money',
};

export default function Loans() {
  const [statusFilter, setStatusFilter] = useState('all');
  const exportCsv = useCsvExport();

  const statusCounts = useMemo(() => {
    const acc = {};
    for (const l of loans) acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, []);

  const filtered = useMemo(
    () => loans.filter(l => statusFilter === 'all' || l.status === statusFilter),
    [statusFilter]
  );

  const filteredTotal = filtered.reduce((s, l) => s + l.amount, 0);

  // Build clean rows for CSV export
  const handleExport = () => {
    const rows = filtered.map(l => ({
      'Loan ID':          l.id,
      'Borrower':         l.user_name,
      'Meter':            l.meter,
      'Amount (ZMW)':     l.amount,
      'Status':           l.status,
      'Repayment Method': METHOD_LABEL[l.payment_method] || '—',
      'Date Borrowed':    l.created_at,
      'Due Date':         l.due_date,
      'Repaid Date':      l.repaid_at || '',
    }));
    exportCsv(rows, 'redbrick-loans.csv');
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-700">Loans</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-navy-600 hover:bg-navy-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => {
          const count = s === 'all' ? loans.length : (statusCounts[s] || 0);
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-navy-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-navy-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : CHIP_DOT[s]}`} />
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Borrower</th>
                <th className="px-5 py-3 text-left">Meter</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-left">Date Borrowed</th>
                <th className="px-5 py-3 text-left">Due Date</th>
                <th className="px-5 py-3 text-left">Repayment Method</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-navy-700 whitespace-nowrap">{l.user_name}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{l.meter}</td>
                  <td className="px-5 py-3 text-right font-semibold text-navy-700">ZMW {l.amount}</td>
                  <td className="px-5 py-3 text-gray-400">{l.created_at}</td>
                  <td className="px-5 py-3 text-gray-400">{l.due_date}</td>
                  <td className="px-5 py-3">
                    <MethodBadge method={l.payment_method} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    No loans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
        <span>{filtered.length} of {loans.length} loans</span>
        <span>Showing ZMW {filteredTotal.toLocaleString()} disbursed</span>
      </div>
    </div>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    active:    'bg-blue-50 text-blue-700',
    repaid:    'bg-green-50 text-green-700',
    overdue:   'bg-orange-50 text-orange-700',
    defaulted: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
}

function MethodBadge({ method }) {
  if (!method) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  const isMtn = method === 'mtn';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        isMtn
          ? 'bg-yellow-50 text-yellow-800'
          : 'bg-red-50 text-red-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isMtn ? 'bg-yellow-500' : 'bg-red-500'}`} />
      {isMtn ? 'MTN MoMo' : 'Airtel Money'}
    </span>
  );
}
