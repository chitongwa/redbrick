import StatCard from '../components/StatCard';
import { scoringData } from '../data/mock';
import { zmw } from '../utils/fmt';

const maxCount = Math.max(...scoringData.distribution.map((d) => d.count));

export default function Scoring() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-navy-700">Scoring Monitor</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Avg Credit Limit" value={zmw(scoringData.avgCreditLimit)} />
        <StatCard label="Customers Scored" value={scoringData.totalScored.toLocaleString()} />
        <StatCard label="Model Version" value={scoringData.modelVersion} />
      </div>

      {/* Distribution chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-navy-700 mb-4">Credit Limit Distribution</h2>
        <div className="space-y-3">
          {scoringData.distribution.map((d) => {
            const pct = (d.count / maxCount) * 100;
            return (
              <div key={d.range} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-500 text-right shrink-0">
                  ZMW {d.range}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-navy-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  >
                    <span className="text-[10px] font-semibold text-white">{d.count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Based on {scoringData.totalScored} scored meters using model {scoringData.modelVersion}
        </p>
      </div>

      {/* Scoring rules */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-navy-700 mb-3">Scoring Rules</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-navy-500 mt-0.5">&#x2022;</span>
            Credit limit = 50% of average monthly ZESCO spend (up to 24 months)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-navy-500 mt-0.5">&#x2022;</span>
            Minimum: ZMW 20 &nbsp;|&nbsp; Maximum: ZMW 500
          </li>
          <li className="flex items-start gap-2">
            <span className="text-navy-500 mt-0.5">&#x2022;</span>
            Less than 3 months of history &rarr; ZMW 20 (minimum)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brick-500 mt-0.5">&#x2022;</span>
            Active unpaid loan &rarr; ZMW 0 (no additional credit)
          </li>
        </ul>
      </div>
    </div>
  );
}
