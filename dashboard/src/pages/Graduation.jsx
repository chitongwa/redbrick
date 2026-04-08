import { useState, useMemo } from 'react';
import { graduationQueue as seedQueue } from '../data/mock';
import { zmw } from '../utils/fmt';

export default function Graduation() {
  const [queue, setQueue] = useState(seedQueue);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // Split into pending / resolved
  const { pending, resolved } = useMemo(() => {
    return {
      pending:  queue.filter(g => g.status === 'pending'),
      resolved: queue.filter(g => g.status !== 'pending'),
    };
  }, [queue]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = (candidate) => {
    setQueue(prev => prev.map(g =>
      g.id === candidate.id
        ? { ...g, status: 'approved', resolved_at: new Date().toISOString() }
        : g
    ));
    showToast(
      `✅ ${candidate.user_name} upgraded to Credit Member. SMS sent with ZMW ${candidate.proposed_credit_limit} credit limit.`,
      'success'
    );
    setConfirmAction(null);
  };

  const handleDefer = (candidate) => {
    setQueue(prev => prev.map(g =>
      g.id === candidate.id
        ? { ...g, status: 'deferred', resolved_at: new Date().toISOString() }
        : g
    ));
    showToast(`⏸ ${candidate.user_name} deferred. Will re-evaluate in 14 days.`, 'info');
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-700">Graduation Queue</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Tier 1 customers eligible for Credit Member upgrade — review and approve
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-yellow-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Review</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{pending.length}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-green-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Approved (This Session)</p>
          <p className="text-3xl font-bold mt-1 text-green-600">
            {resolved.filter(r => r.status === 'approved').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">New Credit Members</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Credit Granted</p>
          <p className="text-3xl font-bold mt-1 text-navy-700">
            {zmw(resolved
              .filter(r => r.status === 'approved')
              .reduce((s, r) => s + (r.proposed_credit_limit || 0), 0))}
          </p>
          <p className="text-xs text-gray-400 mt-1">Initial limits</p>
        </div>
      </div>

      {/* Pending table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-700">Pending Graduations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Transactions</th>
                <th className="px-4 py-3 text-right">Defaults</th>
                <th className="px-4 py-3 text-right">Avg Pay Time</th>
                <th className="px-4 py-3 text-right">Total Volume</th>
                <th className="px-4 py-3 text-right">Proposed Limit</th>
                <th className="px-4 py-3 text-center">Criteria</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-navy-700">{g.user_name}</div>
                    <div className="text-xs text-gray-400">{g.phone_number}</div>
                    <div className="text-xs text-gray-400">{g.neighbourhood} · {g.account_age_months.toFixed(1)} mo</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-navy-700">{g.transactions_completed}</div>
                    <div className="text-[10px] text-gray-400">of 6 min</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={g.trade_credit_default_count > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {g.trade_credit_default_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {g.avg_payment_time_hours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-700">
                    {zmw(g.total_trade_credit_zmw)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 text-sm font-bold">
                      {zmw(g.proposed_credit_limit)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CriteriaPills criteria={g.criteria_met} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmAction({ type: 'approve', candidate: g })}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'defer', candidate: g })}
                        className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Defer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">
                    ✨ No pending graduations — queue is clear
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolved table */}
      {resolved.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-navy-700">Recently Resolved</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Decision</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3 text-left">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resolved.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy-700">{g.user_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        g.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {g.status === 'approved' ? '✓ Approved' : 'Deferred'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {g.status === 'approved' ? zmw(g.proposed_credit_limit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {g.resolved_at ? new Date(g.resolved_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Confirm action modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onConfirm={() => {
            if (confirmAction.type === 'approve') handleApprove(confirmAction.candidate);
            else handleDefer(confirmAction.candidate);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ─── Criteria pills ────────────────────────────────────────────────────────

function CriteriaPills({ criteria }) {
  const labels = {
    min_transactions: '6+ tx',
    no_defaults:      'No defaults',
    account_age:      '3mo+',
    kyc_verified:     'KYC',
    total_volume:    'ZMW 200+',
  };
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {Object.entries(criteria).map(([k, v]) => (
        <span
          key={k}
          title={labels[k] || k}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            v ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {v ? '✓' : '✗'} {labels[k] || k}
        </span>
      ))}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────

function ConfirmModal({ action, onConfirm, onCancel }) {
  const isApprove = action.type === 'approve';
  const c = action.candidate;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-5">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isApprove ? 'bg-green-50' : 'bg-gray-100'
            }`}>
              <span className="text-2xl">{isApprove ? '⭐' : '⏸'}</span>
            </div>
            <h2 className="text-lg font-bold text-navy-700">
              {isApprove ? 'Approve Graduation?' : 'Defer Graduation?'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isApprove
                ? <>Upgrade <strong>{c.user_name}</strong> to Tier 2 — Credit Member with a credit limit of <strong>{zmw(c.proposed_credit_limit)}</strong>. An SMS will be sent automatically.</>
                : <>Defer <strong>{c.user_name}</strong>'s graduation. Will be re-evaluated in 14 days.</>
              }
            </p>

            {isApprove && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Preview SMS:</p>
                <p className="text-xs text-yellow-900 font-mono italic">
                  "RedBrick: Congratulations {c.user_name.split(' ')[0]}! You've been upgraded to Credit Member.
                  You now have a ZMW {c.proposed_credit_limit} credit limit. Open the app to start borrowing."
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold ${
                  isApprove ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                {isApprove ? 'Approve & Send SMS' : 'Defer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
