import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Bell, Database, Key, Palette, Save } from "lucide-react";
import { useState } from "react";
import { COLORS } from "../constants";

export function Settings() {
  const [networkThreshold, setNetworkThreshold] = useState(85);
  const [systemThreshold, setSystemThreshold] = useState(90);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="text-[#717182] text-sm mt-1">Configure your CyberAI Agent preferences and integrations.</p>
        </div>
        <Button className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white">
          <Save className="h-4 w-4 mr-2" /> Save Changes
        </Button>
      </div>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-[#717182] uppercase tracking-wider border-b border-[#30363D] pb-2">
            <Bell className="h-5 w-5" style={{ color: COLORS.amber }} /> Alert Thresholds & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-white">Network Model Confidence</label>
                  <span className="text-sm font-mono" style={{ color: COLORS.blue }}>{networkThreshold}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="99" 
                  value={networkThreshold}
                  onChange={(e) => setNetworkThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-[#30363D] rounded-lg appearance-none cursor-pointer accent-[#2F81F7]"
                />
                <p className="text-xs text-[#717182] mt-2">Alerts will trigger when confidence exceeds this threshold.</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-white">System Model Confidence</label>
                  <span className="text-sm font-mono" style={{ color: COLORS.amber }}>{systemThreshold}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="99" 
                  value={systemThreshold}
                  onChange={(e) => setSystemThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-[#30363D] rounded-lg appearance-none cursor-pointer accent-[#D29922]"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-white block">Notification Channels</label>
              
              <div className="flex items-center justify-between p-3 border border-[#30363D] rounded-md bg-[#0D1117]">
                <div>
                  <h4 className="text-sm font-medium text-white">Email Alerts</h4>
                  <p className="text-xs text-[#717182]">Receive daily summaries and critical alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[#30363D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3FB950]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-[#30363D] rounded-md bg-[#0D1117]">
                <div>
                  <h4 className="text-sm font-medium text-white">Slack Webhook</h4>
                  <p className="text-xs text-[#717182]">Instant notification for critical alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[#30363D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3FB950]"></div>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
             <Button className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white mt-2"><Save className="h-4 w-4 mr-2" /> Save Thresholds</Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-[#717182] uppercase tracking-wider border-b border-[#30363D] pb-2">
            <Database className="h-5 w-5" style={{ color: COLORS.green }} /> Pipeline Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border border-[#2F81F7]/30 bg-[#2F81F7]/5 rounded-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${COLORS.blue}33` }}>
                  <span className="font-bold" style={{ color: COLORS.blue }}>N</span>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">Network Model (CIC-IDS2017)</h4>
                  <p className="text-xs text-[#717182]">Active pipeline running</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#30363D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F81F7]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-[#D29922]/30 bg-[#D29922]/5 rounded-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${COLORS.amber}33` }}>
                  <span className="font-bold" style={{ color: COLORS.amber }}>H</span>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">System Model (HDFS)</h4>
                  <p className="text-xs text-[#717182]">Active pipeline running</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[#30363D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D29922]"></div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#30363D]">
            <label className="text-sm font-medium text-white mb-2 block">HDFS Log Source Path</label>
            <input 
              type="text" 
              defaultValue="hdfs://cluster/logs/hadoop/hdfs/audit.log"
              className="w-full h-10 bg-[#0D1117] border border-[#30363D] rounded-md px-3 text-sm text-white font-mono focus:outline-none focus:border-[#2F81F7] focus:ring-1 focus:ring-[#2F81F7]"
            />
          </div>
          <div className="pt-4">
            <label className="text-sm font-medium text-white mb-2 block">Network Flow Data Path</label>
            <input 
              type="text" 
              defaultValue="/var/log/suricata/eve.json"
              className="w-full h-10 bg-[#0D1117] border border-[#30363D] rounded-md px-3 text-sm text-white font-mono focus:outline-none focus:border-[#2F81F7] focus:ring-1 focus:ring-[#2F81F7]"
            />
          </div>
          <div className="flex justify-end">
             <Button className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white mt-2"><Save className="h-4 w-4 mr-2" /> Save Pipeline</Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-[#717182] uppercase tracking-wider border-b border-[#30363D] pb-2">
            <Key className="h-5 w-5" style={{ color: COLORS.red }} /> Integrations & API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">OpenAI API Key (for explanations)</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 h-10 bg-[#0D1117] border border-[#30363D] rounded-md px-3 text-sm text-[#717182] font-mono focus:outline-none focus:border-[#2F81F7]"
              />
              <Button variant="outline">Revoke</Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-white mb-2 block">SMTP Key</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                defaultValue="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 h-10 bg-[#0D1117] border border-[#30363D] rounded-md px-3 text-sm text-[#717182] font-mono focus:outline-none focus:border-[#2F81F7]"
              />
              <Button variant="outline">Update</Button>
            </div>
          </div>
          <div className="flex justify-end">
             <Button className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white mt-2"><Save className="h-4 w-4 mr-2" /> Save Keys</Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-[#717182] uppercase tracking-wider border-b border-[#30363D] pb-2">
            <Palette className="h-5 w-5 text-[#e9ebef]" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Theme Preference</h4>
              <p className="text-xs text-[#717182]">CyberAI is optimized for high-contrast low-light environments.</p>
            </div>
            <select disabled title="Dark mode is always on" className="bg-[#0D1117] border border-[#30363D] rounded-md h-10 px-3 text-sm text-white opacity-50 cursor-not-allowed">
              <option>Dark Mode (Fixed)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Font Size</h4>
              <p className="text-xs text-[#717182]">Adjust the global UI font size.</p>
            </div>
            <select className="bg-[#0D1117] border border-[#30363D] rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:border-[#2F81F7] focus:ring-1 focus:ring-[#2F81F7]">
              <option value="sm">Small</option>
              <option value="md" selected>Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
