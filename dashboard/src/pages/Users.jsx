import { useState, useMemo } from 'react';
import { users, loans, transactions } from '../data/mock';
import { zmw } from '../utils/fmt';

export default function Users() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Pre-compute totals per user
  const userTotals = useMemo(() => {
    const map = {};
    for (const u of users) {
      map[u.id] = loans
        .filter(l => l.user_id === u.id)
        .reduce((sum, l) => sum + l.amount, 0);
    }
    return map;
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.phone_number.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    const matchKyc = kycFilter === 'all' || u.kyc_status === kycFilter;
    return matchSearch && matchKyc;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy-700">Users</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick-500 focus:border-transparent outline-none text-sm"
        />
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
        >
          <option value="all">All KYC</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-right">Meters</th>
                <th className="px-5 py-3 text-left">KYC</th>
                <th className="px-5 py-3 text-left">Registered</th>
                <th className="px-5 py-3 text-right">Total Borrowed</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-navy-700">{u.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.phone_number}</td>
                  <td className="px-5 py-3 text-right">{u.meters}</td>
                  <td className="px-5 py-3">
                    <KycBadge status={u.kyc_status} />
                  </td>
                  <td className="px-5 py-3 text-gray-400">{u.created_at}</td>
                  <td className="px-5 py-3 text-right font-semibold text-navy-700">
                    {userTotals[u.id] > 0 ? zmw(userTotals[u.id]) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-xs text-brick-500 hover:text-brick-600 font-semibold whitespace-nowrap"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {users.length} users</p>

      {/* Side panel */}
      {selectedUser && (
        <UserPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

// ── Slide-over side panel ───────────────────────────────────────────────────

function UserPanel({ user, onClose }) {
  const userLoans = useMemo(
    () => loans.filter(l => l.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [user.id]
  );
  const userTxs = useMemo(
    () => transactions.filter(t => t.user_id === user.id).sort((a, b) => b.purchased_at.localeCompare(a.purchased_at)),
    [user.id]
  );
  const totalBorrowed = userLoans.reduce((s, l) => s + l.amount, 0);
  const totalSpent    = userTxs.reduce((s, t) => s + t.amount_zmw, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-bold text-navy-700">
              {user.full_name.split(' ').map(w => w[0]).join('')}
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-700">{user.full_name}</h2>
              <p className="text-xs text-gray-400">{user.phone_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="KYC Status" value={<KycBadge status={user.kyc_status} />} />
            <MiniStat label="Meters" value={user.meters} />
            <MiniStat label="Neighbourhood" value={user.neighbourhood || '—'} />
            <MiniStat label="Registered" value={user.created_at} />
            <MiniStat label="Total Borrowed" value={totalBorrowed > 0 ? zmw(totalBorrowed) : '—'} />
            <MiniStat label="ZESCO Spend" value={zmw(totalSpent)} />
          </div>

          {/* Loans section */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 mb-3">
              Loans ({userLoans.length})
            </h3>
            {userLoans.length === 0 ? (
              <p className="text-sm text-gray-400">No loans yet</p>
            ) : (
              <div className="space-y-2">
                {userLoans.map(l => (
                  <div key={l.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-navy-700">{zmw(l.amount)}</p>
                      <p className="text-xs text-gray-400">
                        {l.created_at} &rarr; due {l.due_date}
                      </p>
                      {l.repaid_at && (
                        <p className="text-xs text-green-600">
                          Repaid {l.repaid_at} via {l.payment_method?.toUpperCase()}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction history section */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 mb-3">
              ZESCO Purchase History ({userTxs.length})
            </h3>
            {userTxs.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Units (kWh)</th>
                      <th className="px-3 py-2 text-left">Meter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userTxs.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{t.purchased_at}</td>
                        <td className="px-3 py-2 text-right font-medium text-navy-700">{zmw(t.amount_zmw)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{t.units_purchased}</td>
                        <td className="px-3 py-2 text-gray-400">{t.meter_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared small components ─────────────────────────────────────────────────

function MiniStat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm font-bold text-navy-700 mt-0.5">
        {typeof value === 'string' || typeof value === 'number' ? value : value}
      </div>
    </div>
  );
}

function KycBadge({ status }) {
  const styles = {
    verified: 'bg-green-50 text-green-700',
    pending:  'bg-yellow-50 text-yellow-700',
    rejected: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || ''}`}>
      {status}
    </span>
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
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
}
