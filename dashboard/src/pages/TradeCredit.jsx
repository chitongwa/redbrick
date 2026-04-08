import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tradeCreditOrders as seedOrders } from '../data/mock';
import { zmw } from '../utils/fmt';

const FILTERS = [
  { key: 'all',       label: 'All',              color: 'gray'   },
  { key: 'pending',   label: 'Pending Payment',  color: 'yellow' },
  { key: 'paid',      label: 'Paid',             color: 'green'  },
  { key: 'overdue',   label: 'Overdue',          color: 'orange' },
  { key: 'frozen',    label: 'Frozen',           color: 'red'    },
];

export default function TradeCredit() {
  const [orders, setOrders]   = useState(seedOrders);
  const [searchParams]        = useSearchParams();
  const [filter, setFilter]   = useState(searchParams.get('filter') || 'all');
  const [search, setSearch]   = useState('');
  const [now, setNow]         = useState(new Date());
  const [unfreezeTarget, setUnfreezeTarget] = useState(null);
  const [toast, setToast]     = useState(null);

  // Tick clock every second for countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync filter from URL
  useEffect(() => {
    const f = searchParams.get('filter');
    if (f && FILTERS.some(x => x.key === f)) setFilter(f);
  }, [searchParams]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter(o => {
      // Filter by status
      if (filter === 'pending' && o.status !== 'token_delivered') return false;
      if (filter === 'paid'    && o.status !== 'paid')            return false;
      if (filter === 'overdue' && o.status !== 'overdue')         return false;
      if (filter === 'frozen'  && o.status !== 'frozen')          return false;

      // Filter by search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = o.user_name.toLowerCase().includes(q)
                    || o.meter.toLowerCase().includes(q)
                    || o.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, filter, search]);

  // ── Counts per filter ─────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:     orders.length,
    pending: orders.filter(o => o.status === 'token_delivered').length,
    paid:    orders.filter(o => o.status === 'paid').length,
    overdue: orders.filter(o => o.status === 'overdue').length,
    frozen:  orders.filter(o => o.status === 'frozen').length,
  }), [orders]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUnfreeze = (order, reason) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? { ...o, status: 'token_delivered', unfrozen_at: new Date().toISOString(), unfreeze_reason: reason }
        : o
    ));
    showToast(
      `🔓 ${order.user_name} unfrozen. Reason: "${reason}". Customer will be notified via SMS.`,
      'success'
    );
    setUnfreezeTarget(null);
  };

  // ── Aggregates ────────────────────────────────────────────────────────
  const aggregates = useMemo(() => {
    const pending  = orders.filter(o => ['token_delivered', 'overdue', 'frozen'].includes(o.status));
    return {
      totalOrders:      orders.length,
      outstanding:      pending.reduce((s, o) => s + o.total_due, 0),
      overdueCount:     counts.overdue + counts.frozen,
      feesCollected:    orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.service_fee || 0), 0),
    };
  }, [orders, counts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-700">Trade Credit Orders</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Active Tier 1 trade credit orders — monitor payment status, unfreeze accounts
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p>
          <p className="text-2xl font-bold mt-1 text-navy-700">{aggregates.totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding ZMW</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{zmw(aggregates.outstanding)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue / Frozen</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{aggregates.overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Fees Collected</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{zmw(aggregates.feesCollected)}</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f.key
                  ? f.key === 'pending'  ? 'bg-yellow-500  text-white'
                  : f.key === 'paid'     ? 'bg-green-500   text-white'
                  : f.key === 'overdue'  ? 'bg-orange-500  text-white'
                  : f.key === 'frozen'   ? 'bg-red-500     text-white'
                  :                        'bg-navy-600    text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">({counts[f.key]})</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name, meter, order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
        />
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Order / Customer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Fee (4%)</th>
                <th className="px-4 py-3 text-right">Total Due</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Countdown</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-navy-700">{o.user_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{o.id} · {o.meter}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {zmw(o.electricity_amt)}
                    <div className="text-[10px] text-gray-400">{o.units_kwh} kWh</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{zmw(o.service_fee)}</td>
                  <td className="px-4 py-3 text-right font-bold text-navy-700">{zmw(o.total_due)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                    {o.payment_method && (
                      <div className="text-[10px] text-gray-400 mt-0.5 uppercase">
                        via {o.payment_method}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Countdown order={o} now={now} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'frozen' ? (
                      <button
                        onClick={() => setUnfreezeTarget(o)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        🔓 Unfreeze
                      </button>
                    ) : o.status === 'overdue' ? (
                      <span className="text-xs text-orange-600 font-semibold">Send reminder</span>
                    ) : o.status === 'paid' ? (
                      <span className="text-xs text-green-600">✓ Settled</span>
                    ) : (
                      <span className="text-xs text-gray-400">Awaiting payment</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    No orders match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {orders.length} orders</p>

      {/* Unfreeze modal */}
      {unfreezeTarget && (
        <UnfreezeModal
          order={unfreezeTarget}
          onCancel={() => setUnfreezeTarget(null)}
          onConfirm={(reason) => handleUnfreeze(unfreezeTarget, reason)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    paid:             { color: 'bg-green-50 text-green-700',    label: 'Paid' },
    token_delivered:  { color: 'bg-yellow-50 text-yellow-700',  label: 'Pending' },
    overdue:          { color: 'bg-orange-50 text-orange-700',  label: 'Overdue' },
    frozen:           { color: 'bg-red-50 text-red-700',        label: 'Frozen' },
  };
  const s = styles[status] || { color: 'bg-gray-50 text-gray-600', label: status };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

// ─── Countdown timer ────────────────────────────────────────────────────

function Countdown({ order, now }) {
  if (order.status === 'paid') {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const due = new Date(order.due_at);
  const diffMs = due - now;
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const h = Math.floor(absMs / 3600000);
  const m = Math.floor((absMs % 3600000) / 60000);
  const s = Math.floor((absMs % 60000) / 1000);

  if (order.status === 'frozen') {
    return (
      <div className="text-xs">
        <span className="text-red-600 font-bold">FROZEN</span>
        <div className="text-[10px] text-gray-400">+{h}h past due</div>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="text-xs">
        <span className="text-red-600 font-bold font-mono">+{h}h {m}m</span>
        <div className="text-[10px] text-red-500">OVERDUE</div>
      </div>
    );
  }

  const colorClass = h < 6 ? 'text-red-600'
                   : h < 12 ? 'text-orange-500'
                   : 'text-green-600';

  return (
    <div className="text-xs">
      <span className={`font-bold font-mono ${colorClass}`}>
        {h}h {m}m {s}s
      </span>
      <div className="text-[10px] text-gray-400">remaining</div>
    </div>
  );
}

// ─── Unfreeze modal ─────────────────────────────────────────────────────

function UnfreezeModal({ order, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const canSubmit = reason.trim().length >= 10 && confirmChecked;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-5">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <span className="text-2xl">🔓</span>
            </div>
            <h2 className="text-lg font-bold text-navy-700">Manually Unfreeze Account</h2>
            <p className="text-sm text-gray-500 mt-1">
              Unfreeze <strong>{order.user_name}</strong>'s account (Order {order.id}).
              This action is logged and should only be used for genuine hardship cases.
            </p>

            <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Order:</span><span className="font-mono">{order.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-semibold">{order.user_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount owed:</span><span className="font-semibold text-red-600">{zmw(order.total_due)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Frozen since:</span><span>{order.frozen_at ? new Date(order.frozen_at).toLocaleString() : '—'}</span></div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Reason (required, min 10 chars)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Customer contacted support citing medical emergency, will pay within 48h. Verified via phone call with spouse."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {reason.length}/10 minimum characters
              </p>
            </div>

            <label className="mt-4 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-gray-600">
                I confirm this is a genuine hardship case and I have authority to unfreeze this account.
                The customer will remain liable for the outstanding amount.
              </span>
            </label>

            <div className="flex gap-3 mt-5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => canSubmit && onConfirm(reason.trim())}
                disabled={!canSubmit}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                  canSubmit
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Unfreeze Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
