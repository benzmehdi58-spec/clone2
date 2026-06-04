import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  Server,
  Cpu,
  Crosshair,
  Database,
  BrainCircuit,
  ShieldCheck,
  X,
  FileText,
  Activity,
  Terminal,
  Zap,
  Target,
  Search,
  ArrowRight,
  ChevronDown
} from "lucide-react";

// Shared node configuration
const PIPELINE_NODES = [
  {
    id: "hdfs",
    title: "HDFS Model",
    subtitle: "BiLSTM Sequence Classifier",
    color: "#D29922", // Amber
    icon: Server,
    pills: ["LSTM", "vocab.pkl", "100 tokens"],
    stat: "Threshold: 0.5",
    tooltip: "Reads HDFS block sessions as ordered integer sequences.\n40+ regex patterns map raw log lines to Drain templates.\nvocab.pkl converts templates to integers, padded to 100 tokens.\nLSTM outputs Anomaly probability → threshold 0.5."
  },
  {
    id: "netflow",
    title: "Network Pipeline",
    subtitle: "3-Stage Ensemble",
    color: "#2F81F7", // Blue
    icon: Cpu,
    internalStages: [
      { name: "Stage 1", text: "LightGBM  threshold: 0.30" },
      { name: "Stage 2", text: "XGBoost   8 attack classes" },
      { name: "Stage 3", text: "Autoencoder  bottleneck: 16d" }
    ],
    stat: "Zero-Day Detection",
    tooltip: "Stage 1 — LightGBM gates traffic at threshold 0.30.\nStage 2 — XGBoost classifies: DDoS, DoS, BruteForce,\nPortScan, Bot, Exploits, Generic, Zero-Day.\nStage 3 — Autoencoder (128→64→16→64→128) flags\nreconstruction_error > threshold as ZERO_DAY."
  },
  {
    id: "mitre",
    title: "MITRE Mapper",
    subtitle: "Rule-Based Enrichment",
    color: "split", // Handled uniquely
    icon: Crosshair,
    pills: ["Tactic", "Technique", "Kill Chain 1-7"],
    examples: ["ddos → T1498 · Stage 7", "scanning → T1595 · Stage 1"],
    tooltip: "Maps normalized attack_type to MITRE ATT&CK framework.\nLayer 2: inspects Dst Port + packet ratio for sub-techniques.\nExample: Port 53 + bwd_pkts > fwd*3 → T1498.002 DNS Reflection.\nHDFS anomalies: confidence ≥ 0.90 → T1485 Data Destruction."
  },
  {
    id: "rag",
    title: "RAG System",
    subtitle: "Vector Search + LLM Synthesis",
    color: "#58A6FF", // Cyan
    icon: Database,
    pills: ["ChromaDB", "all-MiniLM-L6-v2", "NVD CVEs"],
    stat: "top_k: 3 chunks",
    tooltip: "Ingests MITRE ATT&CK mitigations from enterprise-attack.json.\nEmbeds with HuggingFace all-MiniLM-L6-v2 → ChromaDB store.\nSemantic search retrieves top 3 relevant chunks per detection.\nLLM synthesis produces structured JSON:\n{cve_ids, cvss_max, affected_systems, remediation_steps}"
  },
  {
    id: "react",
    title: "ReAct Agent",
    subtitle: "Autonomous Incident Analyst",
    color: "#8957E5", // Purple
    icon: BrainCircuit,
    pills: ["Gemini", "Groq", "Cerebras"],
    showLoop: true,
    stat: "Tools: 4 available",
    tooltip: "ReAct loop: Observe → Think → Act → Observe (max 8 cycles).\nTools: get_recent_alerts, get_block_session,\nget_flows_by_type, create_incident.\nFallback chain: Gemini → Groq → Cerebras.\nOutputs structured incident report in markdown."
  }
];

const HdfsPanel = ({ onClose }: { onClose: () => void }) => (
  <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
    <div className="flex w-full justify-end px-4 absolute top-4 right-4">
      <button onClick={onClose} className="p-2 hover:bg-[#30363D] rounded-md text-[#717182] hover:text-[#E9EBEF] transition-colors"><X className="w-5 h-5" /></button>
    </div>
    <Server className="w-16 h-16 text-[#D29922] mb-6 opacity-80" />
    <h2 className="text-2xl font-bold text-[#E9EBEF] mb-3">HDFS Sequence Model</h2>
    <p className="text-[#717182] max-w-md">Detailed panel for the HDFS BiLSTM sequence classifier is currently under construction. Please select the Network Pipeline, MITRE Mapper, or RAG System nodes to explore deep dives.</p>
  </div>
);

const ReactPanel = ({ onClose }: { onClose: () => void }) => (
  <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
    <div className="flex w-full justify-end px-4 absolute top-4 right-4">
      <button onClick={onClose} className="p-2 hover:bg-[#30363D] rounded-md text-[#717182] hover:text-[#E9EBEF] transition-colors"><X className="w-5 h-5" /></button>
    </div>
    <BrainCircuit className="w-16 h-16 text-[#8957E5] mb-6 opacity-80" />
    <h2 className="text-2xl font-bold text-[#E9EBEF] mb-3">ReAct LLM Agent</h2>
    <p className="text-[#717182] max-w-md">Detailed panel for the Autonomous Incident Analyst is currently under construction. Please select the Network Pipeline, MITRE Mapper, or RAG System nodes to explore deep dives.</p>
  </div>
);

const NetflowPanel = ({ onClose }: { onClose: () => void }) => (
  <>
    {/* LEFT COLUMN - Technical Deep Dive */}
    <div className="flex flex-col gap-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2F81F7]/10 rounded border border-[#2F81F7]/30">
            <Cpu className="w-6 h-6 text-[#2F81F7]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#E9EBEF]">Network Flow Pipeline</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-[#2F81F7]/20 text-[#2F81F7] text-[10px] font-mono rounded uppercase tracking-wider">3-Stage Ensemble</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#30363D] rounded-md text-[#717182] hover:text-[#E9EBEF] transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Section 1 - Architecture */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-4 border-b border-[#30363D] pb-2">Stage Architecture</h3>
        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2F81F7] text-white flex items-center justify-center text-xs font-bold font-mono">1</div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-[#E9EBEF] font-bold text-sm">LightGBM Binary Gate</h4>
                  <p className="text-xs text-[#717182] mt-0.5">Analyzes all features → outputs attack_probability</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-[#D29922]">Threshold: 0.30</span>
                  <div className="w-24 h-1.5 bg-[#30363D] mt-1 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-[#2F81F7] w-[30%]"></div>
                    <div className="absolute top-[-2px] left-[30%] w-2 h-2.5 bg-white shadow"></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] px-2 py-1 bg-[#3FB950]/10 border border-[#3FB950]/30 text-[#3FB950] rounded flex items-center gap-1 font-mono"><Zap className="w-3 h-3"/> BENIGN → stop</span>
                <span className="text-[10px] px-2 py-1 bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] rounded flex items-center gap-1 font-mono"><Target className="w-3 h-3"/> ATTACK → Stage 2</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2F81F7] text-white flex items-center justify-center text-xs font-bold font-mono">2</div>
            <div className="flex-1">
              <h4 className="text-[#E9EBEF] font-bold text-sm">XGBoost Multi-Class Classifier</h4>
              <p className="text-xs text-[#717182] mt-0.5 mb-3">Classifies attack family from 8 categories</p>
              <div className="grid grid-cols-4 gap-2">
                {['bot', 'ddos', 'dos', 'bruteforce', 'scanning', 'exploits', 'generic', 'zero_day'].map(c => (
                  <div key={c} className="text-[10px] text-center py-1 bg-[#F85149]/5 border border-[#F85149]/20 text-[#F85149] rounded font-mono">{c}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2F81F7] text-white flex items-center justify-center text-xs font-bold font-mono">3</div>
            <div className="flex-1">
              <h4 className="text-[#E9EBEF] font-bold text-sm">Autoencoder — Zero-Day Detector</h4>
              <div className="my-3 font-mono text-xs text-[#E9EBEF] flex items-center gap-2">
                128 <ArrowRight className="w-3 h-3 text-[#717182]"/> 64 <ArrowRight className="w-3 h-3 text-[#717182]"/> <span className="bg-[#2F81F7]/20 text-[#2F81F7] px-1 rounded border border-[#2F81F7]/30">[16]</span> <ArrowRight className="w-3 h-3 text-[#717182]"/> 64 <ArrowRight className="w-3 h-3 text-[#717182]"/> 128
              </div>
              <p className="text-xs text-[#F85149] font-mono bg-[#F85149]/10 px-2 py-1 rounded inline-block">
                reconstruction_error &gt; threshold → ZERO_DAY flag
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 & 3 row */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Key Input Features</h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-[10px] text-[#E9EBEF]">
            <div>Flow Bytes/s</div>
            <div>Fwd Packet Length Mean</div>
            <div>Flow Duration</div>
            <div>Flow IAT Mean</div>
            <div>Protocol</div>
            <div>Dst Port</div>
            <div>Total Fwd Packets</div>
            <div>Total Backward Packets</div>
          </div>
          <p className="text-[10px] text-[#717182] mt-3 italic">Full feature set loaded from feature_cols_final.pkl</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Preprocessing Steps</h3>
          <div className="flex flex-col gap-2 font-mono text-[10px]">
            <div className="bg-[#0D1117] border border-[#30363D] px-2 py-1.5 rounded flex items-center justify-between">
              <span className="text-[#E9EBEF]">Strip columns</span> <ArrowRight className="w-3 h-3 text-[#717182]"/>
            </div>
            <div className="bg-[#0D1117] border border-[#30363D] px-2 py-1.5 rounded flex items-center justify-between">
              <span className="text-[#E9EBEF]">inf → NaN</span> <ArrowRight className="w-3 h-3 text-[#717182]"/>
            </div>
            <div className="bg-[#0D1117] border border-[#30363D] px-2 py-1.5 rounded flex items-center justify-between">
              <span className="text-[#E9EBEF]">fill missing: 0</span> <ArrowRight className="w-3 h-3 text-[#717182]"/>
            </div>
            <div className="bg-[#0D1117] border border-[#2F81F7]/50 text-[#2F81F7] px-2 py-1.5 rounded flex items-center justify-center font-bold">
              StandardScaler
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT COLUMN - Live Stats & Schema */}
    <div className="flex flex-col gap-6">
      
      {/* Output Schema */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Output Schema</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
          <span className="text-[#E9EBEF]">{`{`}</span><br/>
          <span className="text-[#2F81F7] ml-4">verdict</span><span className="text-[#E9EBEF]">{`           : `}</span><span className="text-[#D29922]">"BENIGN" | "ATTACK" | "ZERO_DAY"</span><br/>
          <span className="text-[#2F81F7] ml-4">attack_probability</span><span className="text-[#E9EBEF]">{`: `}</span><span className="text-[#D29922]">float</span>   <span className="text-[#717182]">// Stage 1 raw probability</span><br/>
          <span className="text-[#2F81F7] ml-4">attack_type</span><span className="text-[#E9EBEF]">{`       : `}</span><span className="text-[#D29922]">string</span>  <span className="text-[#717182]">// normalized attack class</span><br/>
          <span className="text-[#2F81F7] ml-4">confidence</span><span className="text-[#E9EBEF]">{`        : `}</span><span className="text-[#D29922]">float</span>   <span className="text-[#717182]">// Stage 2 max class prob</span><br/>
          <span className="text-[#2F81F7] ml-4">reconstruction_error</span><span className="text-[#E9EBEF]">{`: `}</span><span className="text-[#D29922]">float</span> <span className="text-[#717182]">// Stage 3 MSE</span><br/>
          <span className="text-[#2F81F7] ml-4">zero_day_flag</span><span className="text-[#E9EBEF]">{`     : `}</span><span className="text-[#D29922]">boolean</span><br/>
          <span className="text-[#2F81F7] ml-4">shap_data</span><span className="text-[#E9EBEF]">{`         : `}</span><span className="text-[#D29922]">list</span>    <span className="text-[#717182]">// top 4 SHAP features</span><br/>
          <span className="text-[#2F81F7] ml-4">mitre</span><span className="text-[#E9EBEF]">{`             : {       `}</span><span className="text-[#717182]">// added by MITRE Mapper</span><br/>
          <span className="text-[#E9EBEF] ml-8">{`tactic, technique_id,`}</span><br/>
          <span className="text-[#E9EBEF] ml-8">{`sub_technique, kill_chain_stage`}</span><br/>
          <span className="text-[#E9EBEF] ml-4">{`} `}</span><br/>
          <span className="text-[#2F81F7] ml-4">vulnerability_analysis</span><span className="text-[#E9EBEF]">{`: {  `}</span><span className="text-[#717182]">// added by RAG</span><br/>
          <span className="text-[#E9EBEF] ml-8">{`cve_ids, cvss_max,`}</span><br/>
          <span className="text-[#E9EBEF] ml-8">{`remediation_steps`}</span><br/>
          <span className="text-[#E9EBEF] ml-4">{`}`}</span><br/>
          <span className="text-[#E9EBEF]">{`}`}</span>
        </div>
      </div>

      {/* Model Performance */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Model Performance</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 flex flex-col items-center">
            <span className="text-[10px] text-[#717182] uppercase">Precision</span>
            <div className="text-lg font-bold text-[#E9EBEF] flex items-center gap-1 mt-1">0.94 <span className="text-[#3FB950] text-[10px]">▲</span></div>
          </div>
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 flex flex-col items-center">
            <span className="text-[10px] text-[#717182] uppercase">Recall</span>
            <div className="text-lg font-bold text-[#E9EBEF] flex items-center gap-1 mt-1">0.91 <span className="text-[#3FB950] text-[10px]">▲</span></div>
          </div>
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 flex flex-col items-center">
            <span className="text-[10px] text-[#717182] uppercase">F1-Score</span>
            <div className="text-lg font-bold text-[#E9EBEF] flex items-center gap-1 mt-1">0.92 <span className="text-[#3FB950] text-[10px]">▲</span></div>
          </div>
        </div>

        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
          <span className="text-[10px] text-[#717182] uppercase mb-3 block">Attack Distribution</span>
          <div className="flex flex-col gap-2 font-mono text-[10px]">
            {[
              { l: 'DDoS', p: '34%', w: 'w-[80%]', o: 'opacity-100' },
              { l: 'PortScan', p: '24%', w: 'w-[60%]', o: 'opacity-90' },
              { l: 'BruteForce', p: '18%', w: 'w-[40%]', o: 'opacity-80' },
              { l: 'DoS', p: '12%', w: 'w-[25%]', o: 'opacity-70' },
              { l: 'Other', p: '8%', w: 'w-[15%]', o: 'opacity-60' },
              { l: 'Zero-Day', p: '4%', w: 'w-[8%]', o: 'opacity-50' }
            ].map(bar => (
              <div key={bar.l} className="flex items-center gap-2">
                <div className="w-20 text-[#E9EBEF]">{bar.l}</div>
                <div className="flex-1 h-3 bg-[#161B22] rounded overflow-hidden">
                  <div className={`h-full bg-[#F85149] ${bar.w} ${bar.o}`}></div>
                </div>
                <div className="w-8 text-right text-[#717182]">{bar.p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SHAP Feature Importance */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">SHAP Feature Importance</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
          <div className="flex flex-col gap-2 font-mono text-[10px]">
            {[
              { l: 'Flow Bytes/s', v: '0.847', w: 'w-[100%]' },
              { l: 'Fwd Packet Length Mean', v: '0.612', w: 'w-[75%]' },
              { l: 'Flow Duration', v: '0.431', w: 'w-[55%]' },
              { l: 'Protocol', v: '0.298', w: 'w-[35%]' }
            ].map(bar => (
              <div key={bar.l} className="flex items-center gap-2">
                <div className="w-36 text-[#E9EBEF] truncate">{bar.l}</div>
                <div className="flex-1 h-3 bg-[#161B22] rounded overflow-hidden">
                  <div className={`h-full bg-[#2F81F7] ${bar.w}`}></div>
                </div>
                <div className="w-10 text-right text-[#717182]">{bar.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  </>
);

const MitrePanel = ({ onClose }: { onClose: () => void }) => (
  <>
    {/* LEFT COLUMN - Technical Deep Dive */}
    <div className="flex flex-col gap-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded border" style={{ background: 'linear-gradient(135deg, rgba(210,153,34,0.1), rgba(47,129,247,0.1))', borderColor: 'rgba(210,153,34,0.3)' }}>
            <Crosshair className="w-6 h-6" style={{ color: '#E9EBEF' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#E9EBEF]">MITRE ATT&CK Mapper</h2>
            <span className="inline-block mt-1 px-2 py-0.5 border text-[10px] font-mono rounded uppercase tracking-wider" style={{ borderColor: 'rgba(47,129,247,0.3)', color: '#2F81F7', background: 'rgba(47,129,247,0.1)' }}>Rule-Based Enrichment</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#30363D] rounded-md text-[#717182] hover:text-[#E9EBEF] transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {/* Section 1 */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-4 border-b border-[#30363D] pb-2">Enrichment Pipeline</h3>
        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'linear-gradient(135deg, #D29922, #2F81F7)' }}>1</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">Base Tactic Mapping</h4>
               <p className="text-xs text-[#717182] mt-0.5">Translates normalized attack_type to primary Tactic.</p>
               <div className="mt-2 text-[10px] font-mono text-[#D29922]">attack_type == "ddos" → Tactic: Impact</div>
             </div>
          </div>
          {/* Step 2 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'linear-gradient(135deg, #D29922, #2F81F7)' }}>2</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">Layer 2 Feature Inspection</h4>
               <p className="text-xs text-[#717182] mt-0.5">Analyzes raw packet attributes for sub-technique identification.</p>
               <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-[#2F81F7]">
                 <span className="bg-[#2F81F7]/10 border border-[#2F81F7]/20 px-1 rounded">Dst Port == 53</span> + <span className="bg-[#2F81F7]/10 border border-[#2F81F7]/20 px-1 rounded">bwd_pkts &gt; fwd * 3</span> → T1498.002
               </div>
             </div>
          </div>
          {/* Step 3 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'linear-gradient(135deg, #D29922, #2F81F7)' }}>3</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">Kill Chain Stage Assignment</h4>
               <p className="text-xs text-[#717182] mt-0.5 mb-2">Maps technique to Cyber Kill Chain for prioritization.</p>
               <div className="flex gap-1 overflow-hidden rounded border border-[#30363D] h-2">
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#30363D]"></div>
                 <div className="flex-1 bg-[#F85149]"></div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Active Ruleset</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-[#E9EBEF]">
           <div className="p-2 border border-[#30363D] rounded">System Log Anomaly (Conf &gt; 0.9) <ArrowRight className="w-3 h-3 inline text-[#717182] mx-1"/> <span className="text-[#D29922]">T1485</span></div>
           <div className="p-2 border border-[#30363D] rounded">TCP Port Scan (Stage 1) <ArrowRight className="w-3 h-3 inline text-[#717182] mx-1"/> <span className="text-[#D29922]">T1046</span></div>
           <div className="p-2 border border-[#30363D] rounded">Brute Force (SMB) <ArrowRight className="w-3 h-3 inline text-[#717182] mx-1"/> <span className="text-[#D29922]">T1110.001</span></div>
           <div className="p-2 border border-[#30363D] rounded">DDoS HTTP Flood <ArrowRight className="w-3 h-3 inline text-[#717182] mx-1"/> <span className="text-[#D29922]">T1498.001</span></div>
        </div>
      </div>
    </div>

    {/* RIGHT COLUMN - Live Stats & Schema */}
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Appended Schema</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 font-mono text-[11px] leading-relaxed">
          <span className="text-[#717182]">// Merged into main payload</span><br/>
          <span className="text-[#2F81F7]">mitre</span><span className="text-[#E9EBEF]">{` : {`}</span><br/>
          <span className="text-[#2F81F7] ml-4">tactic</span><span className="text-[#E9EBEF]">{`           : `}</span><span className="text-[#D29922]">"Impact"</span><br/>
          <span className="text-[#2F81F7] ml-4">technique_id</span><span className="text-[#E9EBEF]">{`     : `}</span><span className="text-[#D29922]">"T1498.002"</span><br/>
          <span className="text-[#2F81F7] ml-4">sub_technique</span><span className="text-[#E9EBEF]">{`    : `}</span><span className="text-[#D29922]">"DNS Reflection"</span><br/>
          <span className="text-[#2F81F7] ml-4">kill_chain_stage</span><span className="text-[#E9EBEF]">{` : `}</span><span className="text-[#3FB950]">7</span><br/>
          <span className="text-[#E9EBEF]">{`}`}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Coverage Stats</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
           <div className="flex items-center justify-between mb-4 border-b border-[#30363D] pb-3">
             <div>
               <div className="text-[10px] text-[#717182] uppercase mb-1">Mapped Techniques</div>
               <div className="text-2xl font-bold text-[#E9EBEF]">142</div>
             </div>
             <div className="text-right">
               <div className="text-[10px] text-[#717182] uppercase mb-1">Mapping Latency</div>
               <div className="text-2xl font-bold text-[#E9EBEF]">&lt; 5ms</div>
             </div>
           </div>
           <span className="text-[10px] text-[#717182] uppercase mb-3 block">Top Tactics Detected</span>
           <div className="flex flex-col gap-2 font-mono text-[10px]">
             <div className="flex items-center gap-2"><div className="w-24 text-[#E9EBEF]">Impact</div><div className="flex-1 h-2 bg-[#161B22] rounded overflow-hidden"><div className="h-full bg-[#D29922] w-[45%]"></div></div><div className="w-8 text-right text-[#717182]">45%</div></div>
             <div className="flex items-center gap-2"><div className="w-24 text-[#E9EBEF]">Discovery</div><div className="flex-1 h-2 bg-[#161B22] rounded overflow-hidden"><div className="h-full bg-[#D29922] w-[30%] opacity-80"></div></div><div className="w-8 text-right text-[#717182]">30%</div></div>
             <div className="flex items-center gap-2"><div className="w-24 text-[#E9EBEF]">Credential Access</div><div className="flex-1 h-2 bg-[#161B22] rounded overflow-hidden"><div className="h-full bg-[#D29922] w-[15%] opacity-60"></div></div><div className="w-8 text-right text-[#717182]">15%</div></div>
             <div className="flex items-center gap-2"><div className="w-24 text-[#E9EBEF]">Lateral Mvmt</div><div className="flex-1 h-2 bg-[#161B22] rounded overflow-hidden"><div className="h-full bg-[#D29922] w-[10%] opacity-40"></div></div><div className="w-8 text-right text-[#717182]">10%</div></div>
           </div>
        </div>
      </div>
    </div>
  </>
);

const RagPanel = ({ onClose }: { onClose: () => void }) => (
  <>
    {/* LEFT COLUMN */}
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#58A6FF]/10 rounded border border-[#58A6FF]/30">
            <Database className="w-6 h-6 text-[#58A6FF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#E9EBEF]">RAG System</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-[#58A6FF]/20 text-[#58A6FF] text-[10px] font-mono rounded uppercase tracking-wider">Vector Search + LLM Synthesis</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#30363D] rounded-md text-[#717182] hover:text-[#E9EBEF] transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-4 border-b border-[#30363D] pb-2">Vector Search Pipeline</h3>
        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#58A6FF] text-white flex items-center justify-center text-xs font-bold font-mono">1</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">Query Embedding</h4>
               <p className="text-xs text-[#717182] mt-0.5">Converts detected threat context into a 384-dimensional vector.</p>
               <div className="mt-2 text-[10px] font-mono px-2 py-1 bg-[#58A6FF]/10 text-[#58A6FF] rounded border border-[#58A6FF]/20 inline-block">Model: all-MiniLM-L6-v2</div>
             </div>
          </div>
          {/* Step 2 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#58A6FF] text-white flex items-center justify-center text-xs font-bold font-mono">2</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">ChromaDB Retrieval</h4>
               <p className="text-xs text-[#717182] mt-0.5 mb-2">Performs semantic search against NVD and MITRE corpora.</p>
               <div className="bg-[#161B22] p-2 rounded border border-[#30363D] text-[10px] font-mono text-[#E9EBEF]">
                 SELECT payload FROM chroma_cve<br/>
                 WHERE similarity(embedding, vec) &gt; 0.85<br/>
                 LIMIT 3;
               </div>
             </div>
          </div>
          {/* Step 3 */}
          <div className="flex gap-4 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
             <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#58A6FF] text-white flex items-center justify-center text-xs font-bold font-mono">3</div>
             <div className="flex-1">
               <h4 className="text-[#E9EBEF] font-bold text-sm">LLM Synthesis</h4>
               <p className="text-xs text-[#717182] mt-0.5">Synthesizes retrieved chunks into a structured JSON response.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Ingestion Sources</h3>
          <ul className="text-xs text-[#E9EBEF] space-y-2 list-disc pl-4">
            <li><span className="font-mono text-[#58A6FF]">enterprise-attack.json</span> (Mitigations)</li>
            <li><span className="font-mono text-[#58A6FF]">nvd-cve-recent.json</span> (Vulnerabilities)</li>
            <li><span className="font-mono text-[#58A6FF]">custom-runbooks.md</span> (Internal Docs)</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Config</h3>
          <div className="flex flex-col gap-2 font-mono text-[10px]">
            <div className="flex justify-between border-b border-[#30363D] pb-1">
              <span className="text-[#717182]">Chunk Size</span><span className="text-[#E9EBEF]">512 tokens</span>
            </div>
            <div className="flex justify-between border-b border-[#30363D] pb-1">
              <span className="text-[#717182]">Overlap</span><span className="text-[#E9EBEF]">64 tokens</span>
            </div>
            <div className="flex justify-between border-b border-[#30363D] pb-1">
              <span className="text-[#717182]">Distance</span><span className="text-[#E9EBEF]">Cosine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#717182]">top_k</span><span className="text-[#E9EBEF]">3</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT COLUMN */}
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Appended Schema</h3>
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 font-mono text-[11px] leading-relaxed">
          <span className="text-[#717182]">// Merged into main payload</span><br/>
          <span className="text-[#2F81F7]">vulnerability_analysis</span><span className="text-[#E9EBEF]">{` : {`}</span><br/>
          <span className="text-[#2F81F7] ml-4">cve_ids</span><span className="text-[#E9EBEF]">{`           : `}</span><span className="text-[#D29922]">{`["CVE-2023-34362"]`}</span><br/>
          <span className="text-[#2F81F7] ml-4">cvss_max</span><span className="text-[#E9EBEF]">{`          : `}</span><span className="text-[#3FB950]">9.8</span><br/>
          <span className="text-[#2F81F7] ml-4">remediation_steps</span><span className="text-[#E9EBEF]">{` : [`}</span><br/>
          <span className="text-[#D29922] ml-8">"Isolate host from WAN"</span><span className="text-[#E9EBEF]">,</span><br/>
          <span className="text-[#D29922] ml-8">"Patch MOVEit Transfer"</span><br/>
          <span className="text-[#E9EBEF] ml-4">{`]`}</span><br/>
          <span className="text-[#E9EBEF]">{`}`}</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#717182] uppercase tracking-wider mb-3 border-b border-[#30363D] pb-2">Database Stats</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 flex flex-col items-center">
            <span className="text-[10px] text-[#717182] uppercase">Indexed Chunks</span>
            <div className="text-lg font-bold text-[#E9EBEF] mt-1">14,205</div>
          </div>
          <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 flex flex-col items-center">
            <span className="text-[10px] text-[#717182] uppercase">Avg Retrieval</span>
            <div className="text-lg font-bold text-[#E9EBEF] mt-1">42ms</div>
          </div>
        </div>
        
        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
          <span className="text-[10px] text-[#717182] uppercase mb-3 block">Similarity Distribution (Last 24h)</span>
          <div className="flex items-end gap-1 h-16 w-full mt-2">
            {[12, 18, 30, 45, 60, 85, 100, 75, 40, 20].map((h, i) => (
              <div key={i} className="flex-1 bg-[#58A6FF] rounded-t opacity-80" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[#717182] font-mono">
            <span>0.0</span>
            <span>Cosine Distance</span>
            <span>1.0</span>
          </div>
        </div>
      </div>
    </div>
  </>
);

export function LearningMode() {
  const [activeView, setActiveView] = useState("interactive");
  const [activeNodeId, setActiveNodeId] = useState<string | null>("netflow");

  return (
    <div className="flex flex-col gap-6 text-[#E9EBEF] font-sans pb-12 w-full max-w-[1440px] mx-auto overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#161B22] border border-[#30363D] rounded-lg">
            <GraduationCap className="w-6 h-6 text-[#E9EBEF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#E9EBEF]">Learning Mode</h1>
            <p className="text-[#717182] mt-1 text-sm">
              Explore how every layer of the AI pipeline works — from raw logs to incident reports.
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-[#161B22] border border-[#30363D] rounded-full">
          <button 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeView === 'interactive' ? 'bg-[#30363D] text-[#E9EBEF]' : 'text-[#717182] hover:text-[#E9EBEF]'}`}
            onClick={() => setActiveView('interactive')}
          >
            <span className="mr-2">🔵</span> Interactive Pipeline
          </button>
          <button 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeView === 'guide' ? 'bg-[#30363D] text-[#E9EBEF]' : 'text-[#717182] hover:text-[#E9EBEF]'}`}
            onClick={() => setActiveView('guide')}
          >
            <span className="mr-2">📋</span> Step-by-Step Guide
          </button>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-[#D29922] via-[#2F81F7] to-transparent opacity-50" />

      {/* CENTRAL SECTION - THE PIPELINE CANVAS */}
      <div className="relative w-full rounded-lg bg-[#0D1117] border border-[#30363D] p-8 flex items-center justify-start shadow-inner min-h-[400px] overflow-x-auto">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E9EBEF 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {/* Connection Lines (SVG) - Positioned absolutely behind nodes */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg className="w-full h-full">
            <defs>
              <linearGradient id="amber-to-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D29922" />
                <stop offset="100%" stopColor="#2F81F7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex w-full items-center justify-between relative z-10 gap-2 xl:gap-4">
          
          {/* RAW INPUT */}
          <div className="flex flex-col items-center shrink-0 w-24">
            <div className="text-[#717182] font-mono text-xs uppercase tracking-widest mb-4">Raw Input</div>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent to-[#717182] border-dashed" />
          </div>

          {PIPELINE_NODES.map((node, index) => {
            const isActive = activeNodeId === node.id;
            const isSplitColor = node.color === "split";
            const borderColor = isSplitColor ? "border-transparent" : `border-[#30363D]`;

            return (
              <div key={node.id} className="flex items-center shrink-0">
                <div 
                  className={`relative group w-[170px] h-[230px] rounded-lg bg-[#161B22] border cursor-pointer transition-all duration-300 flex flex-col items-center p-3 z-10`}
                  style={{
                    borderColor: isActive ? (isSplitColor ? '#D29922' : node.color) : undefined, // fallback for split
                    boxShadow: isActive ? `0 0 20px ${(isSplitColor ? '#D29922' : node.color)}4D` : '0 4px 12px rgba(0,0,0,0.2)',
                    ...(isSplitColor && { borderImage: 'linear-gradient(to right, #D29922, #2F81F7) 1', borderStyle: 'solid', borderWidth: '1px' })
                  }}
                  onClick={() => setActiveNodeId(node.id)}
                >
                  {/* Hover Glow on border */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      boxShadow: `0 0 20px ${(isSplitColor ? '#D29922' : node.color)}4D`,
                      border: `1px solid ${isSplitColor ? '#2F81F7' : node.color}`
                    }}
                  />

                  {/* Icon */}
                  <div className="mt-2 mb-3">
                    <node.icon className="w-8 h-8" style={{ color: isSplitColor ? '#2F81F7' : node.color, filter: `drop-shadow(0 0 8px ${(isSplitColor ? '#2F81F7' : node.color)}99)` }} />
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-sm font-bold text-center leading-tight mb-1">{node.title}</h3>
                  <p className="text-[10px] text-[#717182] text-center mb-3 leading-tight px-1">{node.subtitle}</p>

                  {/* Content Specifics */}
                  {node.pills && (
                    <div className="flex flex-wrap justify-center gap-1 mb-auto">
                      {node.pills.map((pill, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[#E9EBEF]">{pill}</span>
                      ))}
                    </div>
                  )}

                  {node.internalStages && (
                    <div className="flex flex-col gap-1 w-full mb-auto mt-1 px-1">
                      {node.internalStages.map((stage, i) => (
                        <div key={i} className="text-[9px] flex flex-col border-b border-[#30363D] pb-1 last:border-0 last:pb-0">
                          <span className="text-[#E9EBEF]">{stage.name}</span>
                          <span className="text-[#717182] font-mono whitespace-nowrap overflow-hidden text-ellipsis">{stage.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {node.examples && (
                    <div className="flex flex-col gap-1 w-full mb-auto bg-[#0D1117] border border-[#30363D] p-1.5 rounded">
                      {node.examples.map((ex, i) => (
                         <span key={i} className="text-[8px] font-mono text-[#E9EBEF]">{ex}</span>
                      ))}
                    </div>
                  )}

                  {node.showLoop && (
                    <div className="flex items-center gap-1 text-[10px] text-[#8957E5] mt-auto mb-2 font-mono bg-[#8957E5] bg-opacity-10 px-2 py-0.5 rounded">
                       <span>🔄 Max 8 iterations</span>
                    </div>
                  )}

                  {/* Bottom Stat */}
                  {node.stat && !node.showLoop && (
                    <div className="mt-auto pt-2 border-t border-[#30363D] w-full text-center">
                      <span className="text-[10px] font-mono text-[#E9EBEF]">{node.stat}</span>
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-[240px] bg-[#161B22] border border-[#30363D] rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p className="text-xs text-[#E9EBEF] whitespace-pre-wrap leading-relaxed">
                      {node.tooltip}
                    </p>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#161B22] border-b border-r border-[#30363D] transform rotate-45"></div>
                  </div>
                </div>

                {/* Arrow to next node */}
                {index < PIPELINE_NODES.length - 1 && (
                  <div className="w-10 xl:w-16 h-[2px] mx-2 relative shrink-0">
                     <div className="absolute inset-0 border-t-2 border-dashed border-[#717182] opacity-40"></div>
                     <motion.div 
                       className="absolute top-[-3px] w-2 h-2 rounded-full"
                       style={{ backgroundColor: isSplitColor ? '#D29922' : node.color, filter: `drop-shadow(0 0 4px ${isSplitColor ? '#D29922' : node.color})` }}
                       animate={{ left: ["0%", "100%"] }}
                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                     />
                  </div>
                )}
              </div>
            );
          })}

          {/* Arrow to Output */}
          <div className="w-10 xl:w-16 h-[2px] mx-2 relative shrink-0">
             <div className="absolute inset-0 border-t-2 border-dashed border-[#717182] opacity-40"></div>
             <motion.div 
               className="absolute top-[-3px] w-2 h-2 rounded-full bg-[#8957E5]"
               style={{ filter: "drop-shadow(0 0 4px #8957E5)" }}
               animate={{ left: ["0%", "100%"] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
             />
          </div>

          {/* OUTPUT NODE */}
          <div className="w-[140px] h-[160px] rounded-lg bg-[#161B22] border border-[#3FB950] flex flex-col items-center p-3 shrink-0 relative group"
               style={{ boxShadow: "0 0 15px rgba(63, 185, 80, 0.2)" }}>
             <ShieldCheck className="w-8 h-8 text-[#3FB950] mb-2" style={{ filter: "drop-shadow(0 0 8px rgba(63, 185, 80, 0.6))" }} />
             <h3 className="text-xs font-bold text-center mb-1">Incident Report</h3>
             <p className="text-[10px] text-[#717182] text-center mb-3">SOC Dashboard</p>
             <div className="flex flex-col gap-1 w-full">
               <span className="text-[9px] px-1 bg-[#0D1117] border border-[#30363D] rounded text-center">MITRE Technique</span>
               <span className="text-[9px] px-1 bg-[#0D1117] border border-[#30363D] rounded text-center">CVE IDs</span>
               <span className="text-[9px] px-1 bg-[#0D1117] border border-[#30363D] rounded text-center">Remediation</span>
             </div>
          </div>

        </div>
      </div>

      {/* ACTIVE NODE DETAIL PANEL */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeNodeId && (
            <motion.div 
              key={activeNodeId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-6 grid grid-cols-[55%_1fr] gap-8 shadow-xl relative"
            >
              {activeNodeId === "hdfs" && <HdfsPanel onClose={() => setActiveNodeId(null)} />}
              {activeNodeId === "netflow" && <NetflowPanel onClose={() => setActiveNodeId(null)} />}
              {activeNodeId === "mitre" && <MitrePanel onClose={() => setActiveNodeId(null)} />}
              {activeNodeId === "rag" && <RagPanel onClose={() => setActiveNodeId(null)} />}
              {activeNodeId === "react" && <ReactPanel onClose={() => setActiveNodeId(null)} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM SECTION - DATA FLOW TRACES */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[#E9EBEF]">End-to-End Data Flow</h2>
          <div className="flex p-1 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs font-medium">
            <button className="px-3 py-1 rounded-md text-[#717182] hover:text-[#E9EBEF]">HDFS Path</button>
            <button className="px-3 py-1 rounded-md bg-[#30363D] text-[#E9EBEF]">Network Path</button>
          </div>
        </div>

        <div className="flex flex-col relative before:content-[''] before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-[#2F81F7] before:to-[#8957E5] before:opacity-30">
          
          {/* Animated dot on the timeline */}
          <motion.div 
            className="absolute left-[13px] w-2 h-2 rounded-full bg-[#2F81F7] shadow-[0_0_8px_#2F81F7]"
            animate={{ top: ["16px", "100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          {[
            { n: 1, title: 'Raw NetFlow DataFrame', desc: 'Multiple flow records with 47+ features', file: 'network_pipeline.py:_preprocess()' },
            { n: 2, title: 'StandardScaler Transform', desc: 'inf→NaN, missing→0, scale to unit variance', file: 'network_pipeline.py:125-134' },
            { n: 3, title: 'Stage 1: LightGBM Gate', desc: 'attack_probability ≥ 0.30 → ATTACK branch', file: 'network_pipeline.py:166-169' },
            { n: 4, title: 'Stage 2: XGBoost Classification', desc: 'Multi-class prob matrix → ATTACK_MAP → attack_type', file: 'network_pipeline.py:181-195', active: true },
            { n: 5, title: 'Stage 3: Autoencoder', desc: 'reconstruction_error > threshold → zero_day_flag', file: 'network_pipeline.py:197-209' },
            { n: 6, title: 'MITRE ATT&CK Mapper', desc: 'attack_type → tactic + technique_id + kill_chain_stage', file: 'mitre_mapper.py:enrich_batch()' },
            { n: 7, title: 'RAG Vulnerability Analysis', desc: 'ChromaDB semantic search → LLM synthesis → CVE IDs', file: 'rag_manager.py:analyze()' },
            { n: 8, title: 'LLM Agent (BackgroundTask)', desc: 'build_mitre_context() → ReAct loop → create_incident()', file: 'agent_router.py:run_agent()' },
            { n: 9, title: 'Frontend', desc: '/api/alerts → AlertDetail → SHAP + Agent Report', file: 'src/app/pages/AlertDetail.tsx' },
          ].map((step) => (
            <div key={step.n} className={`relative flex items-start gap-4 py-3 px-4 rounded-lg ml-6 ${step.active ? 'bg-[#2F81F7]/10 border border-[#2F81F7]/20 -ml-2' : ''}`}>
               {step.active ? (
                 <div className="absolute -left-[3px] w-[14px] h-[14px] rounded-full bg-[#2F81F7] flex items-center justify-center shadow-[0_0_8px_#2F81F7] translate-y-1 z-10"></div>
               ) : (
                 <div className="absolute -left-[27px] w-[14px] h-[14px] rounded-full bg-[#0D1117] border-2 border-[#2F81F7] flex items-center justify-center translate-y-1 z-10"><div className="w-1.5 h-1.5 rounded-full bg-[#2F81F7]"></div></div>
               )}
               
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className="text-sm font-bold text-[#E9EBEF]">Step {step.n} <span className="mx-2 font-normal text-[#30363D]">|</span> {step.title}</span>
                     <p className="text-xs text-[#717182] mt-0.5">{step.desc}</p>
                   </div>
                   <div className="text-[10px] font-mono text-[#D29922] bg-[#0D1117] px-2 py-1 rounded border border-[#30363D]">
                     {step.file}
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}