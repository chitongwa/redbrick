import { useState } from 'react';

const defaultToggles = {
  zesco_mock: true,
  mtn_mock: true,
  airtel_mock: true,
  sms_mock: true,
};

export default function Settings() {
  const [toggles, setToggles] = useState(defaultToggles);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    // In production: POST to /admin/settings
    console.log('[settings] Saving:', toggles);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-navy-700">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-navy-700 mb-1">Integration Mode</h2>
          <p className="text-xs text-gray-400">
            Toggle mock mode on/off for external services. When mock is ON, no real API calls are made.
          </p>
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="ZESCO API"
            description="Meter verification, balance lookup, token purchase"
            enabled={toggles.zesco_mock}
            onToggle={() => toggle('zesco_mock')}
          />
          <ToggleRow
            label="MTN MoMo"
            description="Mobile money payment processing"
            enabled={toggles.mtn_mock}
            onToggle={() => toggle('mtn_mock')}
          />
          <ToggleRow
            label="Airtel Money"
            description="Mobile money payment processing"
            enabled={toggles.airtel_mock}
            onToggle={() => toggle('airtel_mock')}
          />
          <ToggleRow
            label="SMS Gateway"
            description="OTP delivery via Twilio"
            enabled={toggles.sms_mock}
            onToggle={() => toggle('sms_mock')}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-navy-600 hover:bg-navy-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Save Changes
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              Settings saved
            </span>
          )}
        </div>
      </div>

      {/* Environment info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-navy-700 mb-3">Environment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Backend URL</p>
            <p className="font-mono text-navy-700">http://localhost:3000</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Scoring Engine</p>
            <p className="font-mono text-navy-700">http://localhost:8001</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Database</p>
            <p className="font-mono text-navy-700">PostgreSQL 16</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Scoring Model</p>
            <p className="font-mono text-navy-700">v0.1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold ${enabled ? 'text-yellow-600' : 'text-green-600'}`}>
          {enabled ? 'MOCK' : 'LIVE'}
        </span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-yellow-400' : 'bg-green-500'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
