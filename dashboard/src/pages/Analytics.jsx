import { useMemo, useState } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  revenueDaily,
  revenueWeekly,
  revenueMonthly,
  behaviourStats,
  cohorts,
  floatEconomics,
} from '../data/mock';
import { zmw, num } from '../utils/fmt';
import { downloadCSV, printReport, todayStamp } from '../utils/export';

// ── Brand colours (used consistently across charts) ──────────────────────
const COLORS = {
  tc:    '#eab308', // yellow — Trade Credit fees
  loan:  '#1e3a5f', // navy   — Loan fees
  float: '#ec6650', // brick  — Float margin
  total: '#0f172a',
};

export default function Analytics() {
  const [range, setRange] = useState('monthly'); // 'daily' | 'weekly' | 'monthly'

  // Pick the right revenue dataset for the selected range
  const data = useMemo(() => {
    if (range === 'daily')   return revenueDaily.map((r)  => ({ ...r, label: r.date.slice(5) }));
    if (range === 'weekly')  return revenueWeekly;
    return revenueMonthly;
  }, [range]);

  // Totals for the header KPI cards (always computed over the monthly dataset
  // so the numbers stay stable regardless of what range the user is viewing).
  const totals = useMemo(() => {
    const ytd = revenueMonthly.reduce((acc, m) => ({
      tc_fees:      acc.tc_fees      + m.tc_fees,
      loan_fees:    acc.loan_fees    + m.loan_fees,
      float_margin: acc.float_margin + m.float_margin,
      total:        acc.total        + m.total,
      transactions: acc.transactions + m.transactions,
    }), { tc_fees: 0, loan_fees: 0, float_margin: 0, total: 0, transactions: 0 });

    // Month-over-month growth
    const n = revenueMonthly.length;
    const thisMonth = revenueMonthly[n - 1]?.total ?? 0;
    const lastMonth = revenueMonthly[n - 2]?.total ?? 0;
    const momPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      ...ytd,
      this_month:       thisMonth,
      last_month:       lastMonth,
      mom_growth_pct:   momPct,
      blended_per_txn:  ytd.transactions ? ytd.total / ytd.transactions : 0,
    };
  }, []);

  // ── Export handlers ────────────────────────────────────────────────────
  const handleExportRevenueCSV = () => {
    downloadCSV(
      `revenue-${range}-${todayStamp()}.csv`,
      data,
      [
        { key: 'label',        label: 'Period' },
        { key: 'tc_fees',      label: 'Trade Credit Fees (ZMW)' },
        { key: 'loan_fees',    label: 'Loan Fees (ZMW)' },
        { key: 'float_margin', label: 'Float Margin (ZMW)' },
        { key: 'total',        label: 'Total Revenue (ZMW)' },
        { key: 'transactions', label: 'Transactions' },
      ]
    );
  };

  const handleExportBehaviourCSV = () => {
    const rows = [
      { metric: 'Avg payment time (hrs) — Tier 1',  value: behaviourStats.avg_payment_time_hours.toFixed(1), target: '< 24h' },
      { metric: 'Default rate — Tier 1',            value: (behaviourStats.default_rate_tier1 * 100).toFixed(1) + '%', target: '< 8%' },
      { metric: 'Default rate — Tier 2',            value: (behaviourStats.default_rate_tier2 * 100).toFixed(1) + '%', target: '< 5%' },
      { metric: 'Graduation rate (Tier 1 → Tier 2)', value: (behaviourStats.graduation_rate * 100).toFixed(1) + '%', target: '> 20%' },
      { metric: 'Avg days to graduate',              value: behaviourStats.avg_days_to_graduate, target: '< 90 days' },
      { metric: '30-day retention',                  value: (behaviourStats.retention_30d * 100).toFixed(1) + '%', target: '> 65%' },
      { metric: '60-day retention',                  value: (behaviourStats.retention_60d * 100).toFixed(1) + '%', target: '-' },
      { metric: '90-day retention',                  value: (behaviourStats.retention_90d * 100).toFixed(1) + '%', target: '-' },
    ];
    downloadCSV(
      `behaviour-${todayStamp()}.csv`,
      rows,
      [
        { key: 'metric', label: 'Metric' },
        { key: 'value',  label: 'Value' },
        { key: 'target', label: 'Target' },
      ]
    );
  };

  const handleExportCohortsCSV = () => {
    downloadCSV(
      `cohorts-${todayStamp()}.csv`,
      cohorts,
      [
        { key: 'label',                 label: 'Cohort' },
        { key: 'new_customers',         label: 'New Customers' },
        { key: 'tx_1',                  label: '≥1 Transaction' },
        { key: 'tx_1_pct',              label: '≥1 Tx %' },
        { key: 'tx_3',                  label: '≥3 Transactions' },
        { key: 'tx_3_pct',              label: '≥3 Tx %' },
        { key: 'tx_6',                  label: '≥6 Transactions' },
        { key: 'tx_6_pct',              label: '≥6 Tx %' },
        { key: 'graduated',             label: 'Graduated to Tier 2' },
        { key: 'graduated_pct',         label: 'Graduation %' },
        { key: 'avg_days_to_graduate',  label: 'Avg Days to Graduate' },
      ]
    );
  };

  const handlePrintPDF = () => {
    printReport(`RedBrick Investor Report — ${todayStamp()}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 print-root">
      {/* ── Header with global export buttons ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-700">Revenue &amp; Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Blended performance of Tier 1 + Tier 2 · 12-month view · updated {todayStamp()}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-brick-500 hover:bg-brick-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Revenue KPI cards                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue — This Month"
          value={zmw(totals.this_month)}
          sub={
            <span className={totals.mom_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
              {totals.mom_growth_pct >= 0 ? '▲' : '▼'} {Math.abs(totals.mom_growth_pct).toFixed(1)}% MoM
            </span>
          }
          accent="border-navy-200"
        />
        <KpiCard
          label="Trade Credit Fees (12mo)"
          value={zmw(totals.tc_fees)}
          sub={<span className="text-yellow-600 font-semibold">Tier 1</span>}
          accent="border-yellow-200"
        />
        <KpiCard
          label="Loan Fees (12mo)"
          value={zmw(totals.loan_fees)}
          sub={<span className="text-navy-700 font-semibold">Tier 2</span>}
          accent="border-navy-200"
        />
        <KpiCard
          label="Float Margin (12mo)"
          value={zmw(totals.float_margin)}
          sub={<span className="text-brick-500 font-semibold">{(floatEconomics.margin_pct * 100).toFixed(0)}% spread</span>}
          accent="border-brick-200"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Revenue breakdown — stacked bar chart                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Revenue Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Trade credit fees + loan fees + float margin · combined view
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            {/* Range selector */}
            <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
              {['daily', 'weekly', 'monthly'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    range === r ? 'bg-white text-navy-700 shadow-sm' : 'text-gray-500 hover:text-navy-700'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportRevenueCSV}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100"
            >
              ⬇ CSV
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="p-5">
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => zmw(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tc_fees"      name="Trade Credit Fees" stackId="rev" fill={COLORS.tc} />
                <Bar dataKey="loan_fees"    name="Loan Fees"          stackId="rev" fill={COLORS.loan} />
                <Bar dataKey="float_margin" name="Float Margin"       stackId="rev" fill={COLORS.float} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data table (scrollable on mobile) */}
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Period</th>
                  <th className="px-4 py-2.5 text-right">Trade Credit</th>
                  <th className="px-4 py-2.5 text-right">Loan Fees</th>
                  <th className="px-4 py-2.5 text-right">Float Margin</th>
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                  <th className="px-4 py-2.5 text-right">Txns</th>
                  <th className="px-4 py-2.5 text-right">Per Txn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((row) => (
                  <tr key={row.label} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-navy-700">{row.label}</td>
                    <td className="px-4 py-2 text-right text-yellow-700">{zmw(row.tc_fees)}</td>
                    <td className="px-4 py-2 text-right text-navy-700">{zmw(row.loan_fees)}</td>
                    <td className="px-4 py-2 text-right text-brick-500">{zmw(row.float_margin)}</td>
                    <td className="px-4 py-2 text-right font-bold text-navy-700">{zmw(row.total)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{row.transactions}</td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {row.transactions ? zmw(row.total / row.transactions) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold text-navy-700">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right">{zmw(data.reduce((s, r) => s + r.tc_fees, 0))}</td>
                  <td className="px-4 py-2.5 text-right">{zmw(data.reduce((s, r) => s + r.loan_fees, 0))}</td>
                  <td className="px-4 py-2.5 text-right">{zmw(data.reduce((s, r) => s + r.float_margin, 0))}</td>
                  <td className="px-4 py-2.5 text-right">{zmw(data.reduce((s, r) => s + r.total, 0))}</td>
                  <td className="px-4 py-2.5 text-right">{data.reduce((s, r) => s + r.transactions, 0)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {(() => {
                      const txTotal = data.reduce((s, r) => s + r.transactions, 0);
                      const rvTotal = data.reduce((s, r) => s + r.total,        0);
                      return txTotal ? zmw(rvTotal / txTotal) : '—';
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Float economics mini-card                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Float Economics</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Bulk purchase cost vs retail sale price — the hidden margin
            </p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-brick-50 text-brick-600 font-bold">
            {(floatEconomics.margin_pct * 100).toFixed(0)}% GROSS MARGIN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStat label="Avg Bulk Cost"     value={`ZMW ${floatEconomics.avg_bulk_cost_per_kwh.toFixed(2)}/kWh`} color="text-gray-600" />
          <MiniStat label="Avg Retail Price"  value={`ZMW ${floatEconomics.avg_retail_price_per_kwh.toFixed(2)}/kWh`} color="text-navy-700" />
          <MiniStat label="Margin per kWh"    value={`ZMW ${floatEconomics.margin_per_kwh.toFixed(2)}`} color="text-brick-500" />
          <MiniStat label="30-Day Margin"     value={zmw(floatEconomics.total_margin_30d)} color="text-green-600" sub={`${num(floatEconomics.total_units_sold_30d)} kWh sold`} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Customer behaviour                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl shadow-sm print-page-break">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Customer Behaviour</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Payment speed · default rates · graduation · retention
            </p>
          </div>
          <button
            onClick={handleExportBehaviourCSV}
            className="no-print px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100"
          >
            ⬇ CSV
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Avg payment time */}
          <BehaviourCard
            title="Avg Payment Time (T1)"
            big={`${behaviourStats.avg_payment_time_hours.toFixed(1)}h`}
            target={`Target < ${behaviourStats.target_payment_time_hours}h`}
            trend={`${behaviourStats.payment_time_trend.toFixed(1)}h vs last month`}
            trendGood={behaviourStats.payment_time_trend < 0}
            color="text-green-600"
            barPct={Math.min(100, (behaviourStats.avg_payment_time_hours / behaviourStats.target_payment_time_hours) * 100)}
          />

          {/* Default rate */}
          <BehaviourCard
            title="Default Rate"
            big={`${(behaviourStats.default_rate_tier1 * 100).toFixed(1)}%`}
            target={`Tier 2: ${(behaviourStats.default_rate_tier2 * 100).toFixed(1)}%`}
            trend={`${(behaviourStats.default_trend_tier1 * 100).toFixed(1)} pp vs last month`}
            trendGood={behaviourStats.default_trend_tier1 < 0}
            color="text-yellow-600"
            barPct={Math.min(100, behaviourStats.default_rate_tier1 * 100 * 6)}
          />

          {/* Graduation rate */}
          <BehaviourCard
            title="Graduation Rate"
            big={`${(behaviourStats.graduation_rate * 100).toFixed(1)}%`}
            target={`${behaviourStats.graduated_to_tier2}/${behaviourStats.total_tier1_customers} graduated`}
            trend={`Avg ${behaviourStats.avg_days_to_graduate} days`}
            trendGood
            color="text-brick-500"
            barPct={behaviourStats.graduation_rate * 100}
          />

          {/* Retention */}
          <BehaviourCard
            title="30-Day Retention"
            big={`${(behaviourStats.retention_30d * 100).toFixed(1)}%`}
            target={`60d: ${(behaviourStats.retention_60d * 100).toFixed(0)}% · 90d: ${(behaviourStats.retention_90d * 100).toFixed(0)}%`}
            trend="Target > 65%"
            trendGood
            color="text-navy-700"
            barPct={behaviourStats.retention_30d * 100}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Cohort analysis — investor chart                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl shadow-sm print-page-break">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-navy-700">Monthly Cohort Analysis</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Each row = customers who signed up that month · how deep they went + how many graduated
            </p>
          </div>
          <button
            onClick={handleExportCohortsCSV}
            className="no-print px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100"
          >
            ⬇ CSV
          </button>
        </div>

        {/* Stacked chart — cohort size + graduation overlay */}
        <div className="p-5 border-b border-gray-100">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={cohorts} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="new_customers" name="New Customers" fill={COLORS.loan} />
                <Bar dataKey="graduated"     name="Graduated to Tier 2" fill={COLORS.float} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cohort matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Cohort</th>
                <th className="px-4 py-3 text-right">New</th>
                <th className="px-4 py-3 text-right">≥1 Tx</th>
                <th className="px-4 py-3 text-right">≥3 Tx</th>
                <th className="px-4 py-3 text-right">≥6 Tx</th>
                <th className="px-4 py-3 text-right">Graduated</th>
                <th className="px-4 py-3 text-right">Avg Days →</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cohorts.map((c) => (
                <tr key={c.month} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-semibold text-navy-700">{c.label}</td>
                  <td className="px-4 py-2.5 text-right">{c.new_customers}</td>
                  <CohortCell value={c.tx_1} pct={c.tx_1_pct} />
                  <CohortCell value={c.tx_3} pct={c.tx_3_pct} />
                  <CohortCell value={c.tx_6} pct={c.tx_6_pct} />
                  <CohortCell
                    value={c.graduated}
                    pct={c.graduated_pct}
                    highlight
                  />
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {c.avg_days_to_graduate != null ? `${c.avg_days_to_graduate}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 italic">
          Cell intensity = % of that cohort who reached the milestone. Empty (—) = too recent to evaluate.
        </div>
      </section>

      {/* Footer stamp for printed PDF */}
      <div className="hidden print:block text-[9pt] text-gray-400 text-center mt-4">
        RedBrick Electricity Credit — confidential investor report — generated {todayStamp()}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
//  Reusable card components
// ═════════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, sub, accent = 'border-gray-100' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 border ${accent}`}>
      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-2xl font-bold mt-1 text-navy-700">{value}</p>
      <div className="text-xs mt-1">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color, sub }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BehaviourCard({ title, big, target, trend, trendGood, color, barPct }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{big}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{target}</p>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
          style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
        />
      </div>

      <p className={`text-[10px] mt-2 font-semibold ${trendGood ? 'text-green-600' : 'text-red-600'}`}>
        {trendGood ? '▲' : '▼'} {trend}
      </p>
    </div>
  );
}

function CohortCell({ value, pct, highlight }) {
  // Heat-map-style cell: opacity scales with the percentage.
  const intensity = Math.min(1, pct / 100);
  const bg = highlight
    ? `rgba(236, 102, 80, ${0.08 + intensity * 0.45})`   // brick
    : `rgba(30, 58, 95, ${0.04 + intensity * 0.25})`;    // navy
  return (
    <td
      className="px-4 py-2.5 text-right"
      style={{ backgroundColor: value > 0 ? bg : undefined }}
    >
      {value > 0 ? (
        <>
          <span className={`font-semibold ${highlight ? 'text-brick-500' : 'text-navy-700'}`}>{value}</span>
          <span className="text-[10px] text-gray-500 ml-1">({pct}%)</span>
        </>
      ) : (
        <span className="text-gray-300">—</span>
      )}
    </td>
  );
}
