import { useState, useMemo } from 'react';
import {
  defaultTemplates,
  sampleContext,
  renderTemplate,
} from '../data/notificationTemplates';

const defaultToggles = {
  zesco_mock: true,
  mtn_mock: true,
  airtel_mock: true,
  sms_mock: true,
  twilio_mock: true,
  onesignal_mock: true,
};

const TIER_META = {
  tier1:     { label: 'Tier 1 — Trade Credit', color: 'bg-yellow-100 text-yellow-800', accent: 'border-yellow-200' },
  tier2:     { label: 'Tier 2 — Loan Credit',  color: 'bg-navy-100  text-navy-700',    accent: 'border-navy-200' },
  milestone: { label: 'Milestones',            color: 'bg-green-100 text-green-700',   accent: 'border-green-200' },
};

export default function Settings() {
  const [tab, setTab] = useState('integrations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-700">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Admin-only — configure integrations, notification templates and system behaviour
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'integrations'}  onClick={() => setTab('integrations')}>
          Integrations
        </TabButton>
        <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>
          Notifications
        </TabButton>
        <TabButton active={tab === 'environment'}   onClick={() => setTab('environment')}>
          Environment
        </TabButton>
      </div>

      {tab === 'integrations'  && <IntegrationsTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'environment'   && <EnvironmentTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
        active
          ? 'bg-white border border-gray-200 border-b-white text-navy-700 -mb-px'
          : 'text-gray-500 hover:text-navy-700'
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Integrations tab (the original Settings content)
// ─────────────────────────────────────────────────────────────────────────
function IntegrationsTab() {
  const [toggles, setToggles] = useState(defaultToggles);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    console.log('[settings] Saving integrations:', toggles);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-navy-700 mb-1">Integration Mode</h2>
        <p className="text-xs text-gray-400">
          Toggle mock mode for external services. When mock is ON, no real API calls are made.
        </p>
      </div>

      <div className="space-y-4">
        <ToggleRow label="ZESCO API"         description="Meter verification, balance lookup, token purchase"   enabled={toggles.zesco_mock}     onToggle={() => toggle('zesco_mock')} />
        <ToggleRow label="MTN MoMo"          description="Mobile money payment processing"                       enabled={toggles.mtn_mock}       onToggle={() => toggle('mtn_mock')} />
        <ToggleRow label="Airtel Money"      description="Mobile money payment processing"                       enabled={toggles.airtel_mock}    onToggle={() => toggle('airtel_mock')} />
        <ToggleRow label="Twilio SMS"        description="Outbound SMS via Twilio Messaging Service"             enabled={toggles.twilio_mock}    onToggle={() => toggle('twilio_mock')} />
        <ToggleRow label="OneSignal Push"    description="Push notifications to mobile app"                      enabled={toggles.onesignal_mock} onToggle={() => toggle('onesignal_mock')} />
        <ToggleRow label="SMS OTP Gateway"   description="Phone verification codes during login"                 enabled={toggles.sms_mock}       onToggle={() => toggle('sms_mock')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-navy-600 hover:bg-navy-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Save Changes
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Settings saved</span>}
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
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-yellow-400' : 'bg-green-500'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-1' : 'translate-x-6'}`} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Notifications tab — template editor with live preview
// ─────────────────────────────────────────────────────────────────────────
function NotificationsTab() {
  const [templates, setTemplates] = useState(defaultTemplates);
  const [selectedKey, setSelectedKey] = useState(defaultTemplates[0].key);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [testPhone, setTestPhone] = useState('+260977123456');
  const [testOpen, setTestOpen] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.key === selectedKey) || templates[0],
    [templates, selectedKey]
  );

  const grouped = useMemo(() => ({
    tier1:     templates.filter((t) => t.tier === 'tier1'),
    tier2:     templates.filter((t) => t.tier === 'tier2'),
    milestone: templates.filter((t) => t.tier === 'milestone'),
  }), [templates]);

  const updateField = (field, value) => {
    setTemplates((prev) => prev.map((t) => (t.key === selectedKey ? { ...t, [field]: value, is_default: false } : t)));
    setDirty(true);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    // In production: PUT /notifications/templates/:key
    console.log('[notifications] Saving template:', selected.key, selected);
    setTemplates((prev) => prev.map((t) => (t.key === selectedKey ? { ...t, updated_at: new Date().toISOString(), updated_by: 'admin' } : t)));
    setDirty(false);
    showToast(`✓ Template "${selected.label}" saved`, 'success');
  };

  const handleReset = () => {
    const original = defaultTemplates.find((t) => t.key === selectedKey);
    if (!original) return;
    setTemplates((prev) => prev.map((t) => (t.key === selectedKey ? { ...original } : t)));
    setDirty(false);
    showToast(`↻ Reset "${original.label}" to default`, 'info');
  };

  const handleSendTest = () => {
    // In production: POST /notifications/templates/:key/test
    console.log('[notifications] Sending test to', testPhone, 'for template', selected.key);
    setTestOpen(false);
    showToast(`✓ Test dispatched to ${testPhone}`, 'success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ── Template list (left column) ─────────────────────────────── */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-700">Templates</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {templates.length} templates — click to edit
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {Object.entries(grouped).map(([tierKey, list]) => {
            if (list.length === 0) return null;
            const meta = TIER_META[tierKey];
            return (
              <div key={tierKey}>
                <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
                  {meta.label}
                </div>
                {list.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSelectedKey(t.key)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${
                      t.key === selectedKey ? `${meta.accent} bg-gray-50` : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-navy-700">{t.label}</p>
                      <div className="flex gap-1">
                        {t.sms_enabled && <span title="SMS enabled" className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">SMS</span>}
                        {t.push_enabled && <span title="Push enabled" className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">PUSH</span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>
                    {!t.is_default && (
                      <p className="text-[10px] text-yellow-600 mt-1 font-medium">● Modified</p>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Editor (right column) ──────────────────────────────────── */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-navy-700">{selected.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{selected.description}</p>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${TIER_META[selected.tier].color}`}>
              {TIER_META[selected.tier].label}
            </span>
          </div>

          <div className="p-5 space-y-5">
            {/* Variable chips */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Available variables</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.variables.map((v) => (
                  <code
                    key={v}
                    className="text-[11px] px-2 py-1 rounded bg-gray-100 text-navy-700 font-mono cursor-pointer hover:bg-gray-200"
                    onClick={() => navigator.clipboard?.writeText(`{{${v}}}`)}
                    title="Click to copy"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>

            {/* SMS body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">SMS body</label>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold ${selected.sms_body.length > 160 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {selected.sms_body.length} / 160
                  </span>
                  <Toggle enabled={selected.sms_enabled} onToggle={(v) => updateField('sms_enabled', v)} />
                </div>
              </div>
              <textarea
                value={selected.sms_body}
                onChange={(e) => updateField('sms_body', e.target.value)}
                disabled={!selected.sms_enabled}
                rows={4}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="Hello {{first_name}}, …"
              />
            </div>

            {/* Push title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Push title</label>
                <Toggle enabled={selected.push_enabled} onToggle={(v) => updateField('push_enabled', v)} />
              </div>
              <input
                value={selected.push_title}
                onChange={(e) => updateField('push_title', e.target.value)}
                disabled={!selected.push_enabled}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="Payment received"
              />
            </div>

            {/* Push body */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Push body</label>
              <textarea
                value={selected.push_body}
                onChange={(e) => updateField('push_body', e.target.value)}
                disabled={!selected.push_enabled}
                rows={2}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="ZMW {{amount}} — thanks"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[11px] text-gray-400">
              Last updated {new Date(selected.updated_at).toLocaleString()} by {selected.updated_by}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100"
              >
                Reset to default
              </button>
              <button
                onClick={() => setTestOpen(true)}
                className="px-3 py-1.5 border border-navy-300 text-navy-700 text-xs font-semibold rounded-lg hover:bg-navy-50"
              >
                Send test
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  dirty
                    ? 'bg-navy-600 hover:bg-navy-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {dirty ? 'Save changes' : 'Saved'}
              </button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <LivePreview template={selected} />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Test send modal */}
      {testOpen && (
        <TestSendModal
          templateLabel={selected.label}
          phone={testPhone}
          onPhoneChange={setTestPhone}
          onSend={handleSendTest}
          onCancel={() => setTestOpen(false)}
        />
      )}
    </div>
  );
}

// ── Toggle switch ──
function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Live preview (phone-style) ──
function LivePreview({ template }) {
  const sms  = renderTemplate(template.sms_body, sampleContext);
  const pt   = renderTemplate(template.push_title, sampleContext);
  const pb   = renderTemplate(template.push_body, sampleContext);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-navy-700 mb-1">Live preview</h3>
      <p className="text-xs text-gray-400 mb-4">
        Rendered with sample values (Grace Mwamba, ZMW 104, order TC-2418)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SMS preview */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">SMS</p>
          <div className={`rounded-2xl p-4 border ${
            template.sms_enabled ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200 opacity-50'
          }`}>
            <p className="text-[11px] text-gray-400 mb-1.5">From: RedBrick</p>
            <p className="text-sm text-navy-700 whitespace-pre-wrap break-words">
              {sms || <span className="text-gray-300 italic">empty — add some text</span>}
            </p>
            {!template.sms_enabled && (
              <p className="text-[10px] text-red-600 font-semibold mt-2">SMS disabled</p>
            )}
          </div>
        </div>

        {/* Push preview */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Push notification</p>
          <div className={`rounded-2xl p-4 border shadow-sm ${
            template.push_enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brick-500 to-navy-700 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                R
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-navy-700 truncate">
                    {pt || <span className="text-gray-300 italic">Title</span>}
                  </p>
                  <span className="text-[10px] text-gray-400">now</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                  {pb || <span className="text-gray-300 italic">Body</span>}
                </p>
              </div>
            </div>
            {!template.push_enabled && (
              <p className="text-[10px] text-red-600 font-semibold mt-2">Push disabled</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Test send modal ──
function TestSendModal({ templateLabel, phone, onPhoneChange, onSend, onCancel }) {
  const valid = /^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''));
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-navy-700">Send test — {templateLabel}</h2>
            <p className="text-sm text-gray-500 mt-1">
              A real SMS + push will be dispatched to the phone number below using the
              sample context values shown in the live preview.
            </p>

            <label className="block mt-4">
              <span className="text-xs font-semibold text-gray-500 uppercase">Phone number</span>
              <input
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="+260977123456"
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              {!valid && phone && (
                <p className="text-[11px] text-red-600 mt-1">Enter a valid E.164 number</p>
              )}
            </label>

            <div className="flex gap-3 mt-5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onSend}
                disabled={!valid}
                className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold ${
                  valid ? 'bg-navy-600 hover:bg-navy-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Send test
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Environment tab
// ─────────────────────────────────────────────────────────────────────────
function EnvironmentTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 className="text-sm font-semibold text-navy-700 mb-3">Environment</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <EnvRow label="Backend URL"    value="http://localhost:3000" />
        <EnvRow label="Scoring Engine" value="http://localhost:8001" />
        <EnvRow label="Database"       value="PostgreSQL 16" />
        <EnvRow label="Scoring Model"  value="v0.1.0" />
        <EnvRow label="Twilio"         value="Messaging Service" />
        <EnvRow label="OneSignal"      value="Push v1 API" />
      </div>
    </div>
  );
}

function EnvRow({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-mono text-navy-700">{value}</p>
    </div>
  );
}
