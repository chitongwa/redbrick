export default function StatCard({ label, value, sub, accent = false, color }) {
  const textColor = color || (accent ? 'text-brick-500' : 'text-navy-700');
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColor}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
