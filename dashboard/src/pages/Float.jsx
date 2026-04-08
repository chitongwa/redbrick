import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StatCard from '../components/StatCard';
import { floatBalance, floatPurchases, floatDailyConsumption } from '../data/mock';
import { zmw } from '../utils/fmt';

export default function Float() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchases, setPurchases] = useState(floatPurchases);

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // Average daily burn rate (last 7 days vs last 30 days)
    const last7  = floatDailyConsumption.slice(-7);
    const last30 = floatDailyConsumption;
    const avgBurn7  = last7.reduce((s, d) => s + d.units_consumed, 0) / 7;
    const avgBurn30 = last30.reduce((s, d) => s + d.units_consumed, 0) / 30;

    // Projected days until float runs out (using 7-day moving avg)
    const projectedDays = avgBurn7 > 0
      ? Math.floor(floatBalance.total_units / avgBurn7)
      : 999;

    const projectedRunoutDate = new Date();
    projectedRunoutDate.setDate(projectedRunoutDate.getDate() + projectedDays);

    // Color thresholds for float balance
    const floatColor = floatBalance.total_units > 10000 ? 'text-green-600'
                     : floatBalance.total_units >= 1000 ? 'text-orange-500'
                     : 'text-red-600';

    return {
      avgBurn7: Math.round(avgBurn7),
      avgBurn30: Math.round(avgBurn30),
      projectedDays,
      projectedRunoutDate: projectedRunoutDate.toISOString().slice(0, 10),
      floatColor,
    };
  }, [purchases]);

  const totalPurchased = purchases.reduce((s, p) => s + p.units_purchased, 0);
  const totalCost      = purchases.reduce((s, p) => s + p.cost_zmw, 0);

  const handleNewPurchase = (data) => {
    const newPurchase = {
      id: `fp-${String(purchases.length + 1).padStart(3, '0')}`,
      purchased_at: data.date,
      units_purchased: Number(data.units),
      cost_zmw: Number(data.cost),
      cost_per_unit: +(Number(data.cost) / Number(data.units)).toFixed(4),
      vendor: data.vendor || 'ZESCO Bulk',
      reference: data.reference || `REF-${Date.now()}`,
      notes: data.notes || '',
    };
    setPurchases([newPurchase, ...purchases]);
    setShowPurchaseModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header + new purchase button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-700">Float Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Bulk ZESCO inventory, burn rate, and purchase history
          </p>
        </div>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="px-4 py-2 bg-brick-500 hover:bg-brick-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + New Bulk Purchase
        </button>
      </div>

      {/* ── Current balance + projection cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Float Balance (Units)</p>
          <p className={`text-3xl font-bold mt-1 ${stats.floatColor}`}>
            {floatBalance.total_units.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">kWh remaining</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                floatBalance.total_units > 10000 ? 'bg-green-500'
                : floatBalance.total_units >= 1000 ? 'bg-orange-500'
                : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((floatBalance.total_units / 20000) * 100, 100)}%` }}
            />
          </div>
        </div>

        <StatCard
          label="Float Value (ZMW)"
          value={zmw(floatBalance.total_value_zmw)}
          sub={`@ ${zmw(floatBalance.avg_cost_per_unit)}/unit avg`}
        />

        <StatCard
          label="Avg Daily Burn (7d)"
          value={`${stats.avgBurn7.toLocaleString()} units`}
          sub={`30d avg: ${stats.avgBurn30.toLocaleString()} units`}
        />

        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Projected Runout</p>
          <p className={`text-3xl font-bold mt-1 ${
            stats.projectedDays < 5 ? 'text-red-600'
            : stats.projectedDays < 15 ? 'text-orange-500'
            : 'text-green-600'
          }`}>
            {stats.projectedDays} <span className="text-base font-medium text-gray-400">days</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.projectedDays < 5 ? 'URGENT: buy now' : `by ${stats.projectedRunoutDate}`}
          </p>
        </div>
      </div>

      {/* ── Daily consumption chart ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Daily Float Consumption</h2>
            <p className="text-xs text-gray-400 mt-0.5">Units burned per day (last 30 days)</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-full bg-brick-500" />
            Units consumed
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={floatDailyConsumption} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E8533A" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E8533A" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                }}
                formatter={(value, name) =>
                  name === 'units_consumed'
                    ? [`${value.toLocaleString()} units`, 'Consumed']
                    : [zmw(value), 'Value']
                }
              />
              <Area
                type="monotone"
                dataKey="units_consumed"
                stroke="#E8533A"
                strokeWidth={2.5}
                fill="url(#burnGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Total last 30 days: {floatDailyConsumption.reduce((s, d) => s + d.units_consumed, 0).toLocaleString()} units
          ({zmw(floatDailyConsumption.reduce((s, d) => s + d.zmw_value, 0))})
        </p>
      </div>

      {/* ── Purchase history table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Purchase History</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {purchases.length} bulk purchases &middot; {totalPurchased.toLocaleString()} units &middot; {zmw(totalCost)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Vendor</th>
                <th className="px-5 py-3 text-left">Reference</th>
                <th className="px-5 py-3 text-right">Units</th>
                <th className="px-5 py-3 text-right">Cost (ZMW)</th>
                <th className="px-5 py-3 text-right">ZMW/Unit</th>
                <th className="px-5 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500">{p.purchased_at}</td>
                  <td className="px-5 py-3 font-medium text-navy-700">{p.vendor}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 font-mono">{p.reference}</td>
                  <td className="px-5 py-3 text-right font-semibold">{p.units_purchased.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-semibold text-navy-700">{zmw(p.cost_zmw)}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{p.cost_per_unit.toFixed(4)}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New purchase modal ─────────────────────────────────────────── */}
      {showPurchaseModal && (
        <NewPurchaseModal
          onClose={() => setShowPurchaseModal(false)}
          onSubmit={handleNewPurchase}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// New bulk purchase modal
// ═════════════════════════════════════════════════════════════════════════

function NewPurchaseModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    units: '',
    cost: '',
    vendor: 'ZESCO Bulk',
    reference: '',
    notes: '',
  });

  const unitCost = form.units > 0 && form.cost > 0
    ? (Number(form.cost) / Number(form.units)).toFixed(4)
    : '—';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.units || !form.cost) return;
    onSubmit(form);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-700">Record New Bulk Purchase</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Units (kWh)</label>
                <input
                  type="number"
                  min="1"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  placeholder="5000"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost (ZMW)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="11250"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">Cost per unit:</span>
              <span className="text-sm font-bold text-navy-700">ZMW {unitCost}</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference #</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="ZB-20260408-008"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brick-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-brick-500 hover:bg-brick-600 text-white rounded-lg text-sm font-semibold"
              >
                Record Purchase
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
