import { useState, useMemo } from 'react';
import { users, loans, transactions, tradeCreditOrders, loanBalances } from '../data/mock';
import { zmw } from '../utils/fmt';

export default function Users() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
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

  // Pre-compute avg payment time per user from trade credit orders
  const paymentStats = useMemo(() => {
    const map = {};
    for (const u of users) {
      const userOrders = tradeCreditOrders.filter(o => o.user_id === u.id && o.status === 'paid' && o.paid_at);
      if (userOrders.length === 0) {
        map[u.id] = { avgHours: null, count: 0 };
        continue;
      }
      const totalHours = userOrders.reduce((sum, o) => {
        const created = new Date(o.created_at);
        const paid    = new Date(o.paid_at);
        return sum + (paid - created) / 3600000;
      }, 0);
      map[u.id] = {
        avgHours: +(totalHours / userOrders.length).toFixed(1),
        count: userOrders.length,
      };
    }
    return map;
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.phone_number.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
    const matchKyc  = kycFilter === 'all'  || u.kyc_status === kycFilter;
    const matchTier = tierFilter === 'all' || u.tier === tierFilter;
    return matchSearch && matchKyc && matchTier;
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
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
        >
          <option value="all">All Tiers</option>
          <option value="trade_credit">Tier 1 — Trade Credit</option>
          <option value="loan_credit">Tier 2 — Credit Member</option>
        </select>
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
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Tier</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-right">Trade Credits</th>
                <th className="px-4 py-3 text-right">Defaults</th>
                <th className="px-4 py-3 text-right">Avg Pay Time</th>
                <th className="px-4 py-3 text-left">Graduation / Credit</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => {
                const isTier2 = u.tier === 'loan_credit';
                const pay = paymentStats[u.id] || { avgHours: null, count: 0 };
                const bal = loanBalances[u.id] || { credit_limit: 0, outstanding: 0 };
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy-700">{u.full_name}</div>
                      <div className="text-xs text-gray-400">{u.phone_number}</div>
                    </td>
                    <td className="px-4 py-3"><TierBadge tier={u.tier} /></td>
                    <td className="px-4 py-3"><KycBadge status={u.kyc_status} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-700">
                      {u.trade_credit_transactions}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={u.trade_credit_default_count > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                        {u.trade_credit_default_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {pay.avgHours !== null ? `${pay.avgHours}h` : '—'}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      {isTier2 ? (
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500">Outstanding</span>
                            <span className="font-semibold text-navy-700">
                              {zmw(bal.outstanding)} / {zmw(bal.credit_limit)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-navy-500"
                              style={{ width: `${Math.min((bal.outstanding / Math.max(bal.credit_limit, 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <GraduationProgress count={u.trade_credit_transactions} defaults={u.trade_credit_default_count} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-xs text-brick-500 hover:text-brick-600 font-semibold whitespace-nowrap"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
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

          {/* Tier badge */}
          <div className="flex items-center gap-2">
            <TierBadge tier={user.tier} />
            {user.tier_upgraded_at && (
              <span className="text-[10px] text-gray-400">Upgraded {user.tier_upgraded_at}</span>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="KYC Status" value={<KycBadge status={user.kyc_status} />} />
            <MiniStat label="Meters" value={user.meters} />
            <MiniStat label="Neighbourhood" value={user.neighbourhood || '—'} />
            <MiniStat label="Registered" value={user.created_at} />
            <MiniStat label="Total Borrowed" value={totalBorrowed > 0 ? zmw(totalBorrowed) : '—'} />
            <MiniStat label="ZESCO Spend" value={zmw(totalSpent)} />
            <MiniStat label="Trade Credits" value={user.trade_credit_transactions} />
            <MiniStat label="Defaults" value={
              <span className={user.trade_credit_default_count > 0 ? 'text-red-600' : 'text-green-600'}>
                {user.trade_credit_default_count}
              </span>
            } />
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

function TierBadge({ tier }) {
  const isLoan = tier === 'loan_credit';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      isLoan ? 'bg-navy-50 text-navy-700' : 'bg-orange-50 text-orange-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLoan ? 'bg-navy-500' : 'bg-orange-500'}`} />
      {isLoan ? 'Tier 2 — Loan' : 'Tier 1 — Trade'}
    </span>
  );
}

function GraduationProgress({ count, defaults }) {
  const target = 6;
  const pct = Math.min((count / target) * 100, 100);
  const eligible = count >= target && defaults === 0;
  const color = eligible ? 'bg-green-500' : defaults > 0 ? 'bg-red-400' : 'bg-orange-400';

  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-500">Graduation</span>
        <span className={`font-semibold ${eligible ? 'text-green-600' : 'text-navy-700'}`}>
          {count} / {target}
          {eligible && ' ✓'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {eligible && (
        <div className="text-[10px] text-green-600 font-semibold mt-0.5">Ready to graduate</div>
      )}
      {defaults > 0 && (
        <div className="text-[10px] text-red-500 mt-0.5">{defaults} default(s) blocking</div>
      )}
    </div>
  );
}
