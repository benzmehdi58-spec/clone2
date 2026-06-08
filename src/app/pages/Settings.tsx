import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell, Shield, Database, Cpu, Globe, Key, Save,
  ToggleLeft, AlertTriangle, User, Lock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Section wrapper ─── */
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(227,0,15,0.1)' }}>
          <Icon className="w-4 h-4 text-[#E3000F]" />
        </div>
        <span className="text-foreground font-semibold text-sm">{title}</span>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </motion.div>
  );
}

/* ─── Toggle row ─── */
function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-foreground text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5.5 rounded-full shrink-0 transition-all duration-200 focus:outline-none"
        style={{
          background: checked ? '#E3000F' : 'rgba(48,54,61,0.8)',
          boxShadow: checked ? '0 0 10px rgba(227,0,15,0.4)' : 'none',
          width: 40, height: 22,
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white transition-all duration-200 shadow"
          style={{ left: checked ? 20 : 2, width: 18, height: 18 }}
        />
      </button>
    </div>
  );
}

/* ─── Input row ─── */
function InputRow({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none transition-all duration-200"
        style={{
          background: 'rgba(13,17,23,0.6)',
          border: '1px solid rgba(48,54,61,0.8)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(227,0,15,0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(48,54,61,0.8)'; }}
      />
    </div>
  );
}

/* ─── Select row ─── */
function SelectRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none appearance-none cursor-pointer"
        style={{
          background: 'rgba(13,17,23,0.6)',
          border: '1px solid rgba(48,54,61,0.8)',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#161B22' }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Page ─── */
export function Settings() {
  // Notification settings
  const [notifs, setNotifs] = useState({
    criticalAlerts: true,
    zeroDayAlerts: true,
    emailDigest: false,
    slackWebhook: true,
    soundAlerts: false,
  });

  // Detection settings
  const [detection, setDetection] = useState({
    autoBlock: false,
    quarantine: true,
    zeroDay: true,
    confidenceThreshold: '85',
    alertRetention: '30d',
  });

  // Backend settings
  const [backend, setBackend] = useState({
    wsUrl: 'ws://localhost:8000/ws/alerts',
    apiBase: 'http://localhost:8000',
    apiKey: '',
    timeout: '8000',
  });

  // User preferences
  const [prefs, setPrefs] = useState({
    timezone: 'UTC',
    dateFormat: 'ISO',
    pageSize: '25',
    theme: 'dark',
  });

  function handleSave() {
    toast.success('Settings saved successfully', {
      description: 'Configuration will take effect immediately.',
    });
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure CyberAI platform preferences</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: 'rgba(227,0,15,0.12)',
            border: '1px solid rgba(227,0,15,0.3)',
            color: '#E3000F',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(227,0,15,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <ToggleRow
            label="Critical Alert Notifications"
            description="Receive instant alerts for ATTACK verdicts"
            checked={notifs.criticalAlerts}
            onChange={v => setNotifs(p => ({ ...p, criticalAlerts: v }))}
          />
          <ToggleRow
            label="Zero-Day Alert Notifications"
            description="Notify on unknown pattern detections"
            checked={notifs.zeroDayAlerts}
            onChange={v => setNotifs(p => ({ ...p, zeroDayAlerts: v }))}
          />
          <ToggleRow
            label="Daily Email Digest"
            description="Receive a summary report every morning"
            checked={notifs.emailDigest}
            onChange={v => setNotifs(p => ({ ...p, emailDigest: v }))}
          />
          <ToggleRow
            label="Slack Webhook Alerts"
            description="Push critical incidents to Slack channel"
            checked={notifs.slackWebhook}
            onChange={v => setNotifs(p => ({ ...p, slackWebhook: v }))}
          />
          <ToggleRow
            label="Browser Sound Alerts"
            description="Play audio cue when attack is detected"
            checked={notifs.soundAlerts}
            onChange={v => setNotifs(p => ({ ...p, soundAlerts: v }))}
          />
        </Section>

        {/* Detection Engine */}
        <Section title="Detection Engine" icon={Shield}>
          <ToggleRow
            label="Auto-Block Detected Attackers"
            description="Automatically add attacker IPs to blocklist"
            checked={detection.autoBlock}
            onChange={v => setDetection(p => ({ ...p, autoBlock: v }))}
          />
          <ToggleRow
            label="Quarantine Mode"
            description="Isolate compromised hosts automatically"
            checked={detection.quarantine}
            onChange={v => setDetection(p => ({ ...p, quarantine: v }))}
          />
          <ToggleRow
            label="Zero-Day Detection"
            description="Enable ML anomaly detection for unknown threats"
            checked={detection.zeroDay}
            onChange={v => setDetection(p => ({ ...p, zeroDay: v }))}
          />
          <SelectRow
            label="Minimum Confidence Threshold"
            value={detection.confidenceThreshold}
            onChange={v => setDetection(p => ({ ...p, confidenceThreshold: v }))}
            options={[
              { value: '70', label: '70% — High Sensitivity (more false positives)' },
              { value: '80', label: '80% — Balanced' },
              { value: '85', label: '85% — Recommended' },
              { value: '90', label: '90% — High Precision (fewer alerts)' },
              { value: '95', label: '95% — Maximum Precision' },
            ]}
          />
          <SelectRow
            label="Alert Retention Period"
            value={detection.alertRetention}
            onChange={v => setDetection(p => ({ ...p, alertRetention: v }))}
            options={[
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
              { value: '180d', label: '180 days' },
              { value: '365d', label: '1 year' },
            ]}
          />
        </Section>

        {/* Backend Connection */}
        <Section title="Backend Connection" icon={Globe}>
          <InputRow
            label="WebSocket URL"
            value={backend.wsUrl}
            onChange={v => setBackend(p => ({ ...p, wsUrl: v }))}
            placeholder="ws://localhost:8000/ws/alerts"
          />
          <InputRow
            label="API Base URL"
            value={backend.apiBase}
            onChange={v => setBackend(p => ({ ...p, apiBase: v }))}
            placeholder="http://localhost:8000"
          />
          <InputRow
            label="API Key (optional)"
            value={backend.apiKey}
            onChange={v => setBackend(p => ({ ...p, apiKey: v }))}
            type="password"
            placeholder="sk-••••••••••••••••"
          />
          <InputRow
            label="Request Timeout (ms)"
            value={backend.timeout}
            onChange={v => setBackend(p => ({ ...p, timeout: v }))}
            placeholder="8000"
          />
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(227,0,15,0.06)', border: '1px solid rgba(227,0,15,0.15)' }}>
            <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
            <span className="text-muted-foreground text-xs">Changes to the WebSocket URL require a page reload to reconnect.</span>
          </div>
        </Section>

        {/* User Preferences */}
        <Section title="Display Preferences" icon={User}>
          <SelectRow
            label="Timezone"
            value={prefs.timezone}
            onChange={v => setPrefs(p => ({ ...p, timezone: v }))}
            options={[
              { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
              { value: 'DZT', label: 'DZT (Algeria — UTC+1)' },
              { value: 'EST', label: 'EST (Eastern Standard Time)' },
              { value: 'PST', label: 'PST (Pacific Standard Time)' },
              { value: 'CET', label: 'CET (Central European Time)' },
            ]}
          />
          <SelectRow
            label="Timestamp Format"
            value={prefs.dateFormat}
            onChange={v => setPrefs(p => ({ ...p, dateFormat: v }))}
            options={[
              { value: 'ISO', label: 'ISO 8601 (2024-01-15T14:32:00Z)' },
              { value: 'relative', label: 'Relative (2 minutes ago)' },
              { value: 'locale', label: 'Locale (01/15/2024, 2:32:00 PM)' },
            ]}
          />
          <SelectRow
            label="Alerts Per Page"
            value={prefs.pageSize}
            onChange={v => setPrefs(p => ({ ...p, pageSize: v }))}
            options={[
              { value: '10', label: '10 per page' },
              { value: '25', label: '25 per page' },
              { value: '50', label: '50 per page' },
              { value: '100', label: '100 per page' },
            ]}
          />
        </Section>

        {/* API Keys & Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-xl overflow-hidden lg:col-span-2"
        >
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(227,0,15,0.1)' }}>
              <Key className="w-4 h-4 text-[#E3000F]" />
            </div>
            <span className="text-foreground font-semibold text-sm">Integrations</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'LangChain Agent',   status: 'configured',      desc: 'AI analysis endpoint connected' },
                { name: 'SIEM Integration',  status: 'not-configured',  desc: 'Splunk / Elastic SIEM forwarding' },
                { name: 'Threat Intel Feed', status: 'not-configured',  desc: 'MISP / VirusTotal enrichment' },
                { name: 'Slack Alerts',      status: 'configured',      desc: '#security-alerts channel' },
                { name: 'PagerDuty',         status: 'not-configured',  desc: 'On-call escalation routing' },
                { name: 'Jira Ticketing',    status: 'not-configured',  desc: 'Auto-create incident tickets' },
              ].map(item => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    background: 'rgba(13,17,23,0.4)',
                    border: `1px solid ${item.status === 'configured' ? 'rgba(52,211,153,0.2)' : 'rgba(48,54,61,0.6)'}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(227,0,15,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = item.status === 'configured' ? 'rgba(52,211,153,0.2)' : 'rgba(48,54,61,0.6)'; }}
                >
                  <div>
                    <div className="text-foreground text-sm font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{item.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: item.status === 'configured' ? 'rgba(52,211,153,0.1)' : 'rgba(48,54,61,0.4)',
                        color: item.status === 'configured' ? '#34D399' : '#8B949E',
                      }}
                    >
                      {item.status === 'configured' ? 'Active' : 'Set up'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card rounded-xl overflow-hidden lg:col-span-2"
          style={{ border: '1px solid rgba(227,0,15,0.2)' }}
        >
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(227,0,15,0.15)' }}>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(227,0,15,0.1)' }}>
              <AlertTriangle className="w-4 h-4 text-[#E3000F]" />
            </div>
            <span className="text-[#E3000F] font-semibold text-sm">Danger Zone</span>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            {[
              { label: 'Clear Alert History',    desc: 'Remove all logs from the last 30 days' },
              { label: 'Reset ML Models',         desc: 'Revert to last stable checkpoint' },
              { label: 'Purge All Blocklists',    desc: 'Remove all auto-blocked IP entries' },
            ].map(action => (
              <button
                key={action.label}
                className="flex flex-col items-start px-4 py-3 rounded-lg text-left transition-all duration-200"
                style={{
                  background: 'rgba(227,0,15,0.05)',
                  border: '1px solid rgba(227,0,15,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(227,0,15,0.1)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(227,0,15,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(227,0,15,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => toast.error(`${action.label} — Confirm in production`)}
              >
                <span className="text-[#E3000F] text-sm font-medium">{action.label}</span>
                <span className="text-muted-foreground text-xs mt-0.5">{action.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
