import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DatabaseZap, Users, ShieldAlert, ChevronRight, Lock, Unlock } from 'lucide-react';

const TABS = [
  { id: 'rag', label: 'RAG Assistant', icon: <FileText size={18} /> },
  { id: 'sql', label: 'Text-to-SQL', icon: <DatabaseZap size={18} /> },
  { id: 'marketing', label: 'Marketing Engine', icon: <Users size={18} /> },
  { id: 'support', label: 'Fraud Detection', icon: <ShieldAlert size={18} /> }
];

const RAGFlow = () => {
  const [step, setStep] = useState(0);
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-8 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Unstructured Data: RAG Assistant</h3>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li><strong>Hybrid Retrieval:</strong> Combines <code className="bg-gray-100 px-1 rounded">pgvector</code> semantic search with PostgreSQL full-text keyword search.</li>
            <li><strong>Optimization:</strong> Merges results using Reciprocal Rank Fusion (RRF).</li>
            <li><strong>Security:</strong> Strict Role-Based Access Control (RBAC) at the query level.</li>
        </ul>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
        <div className="flex items-center gap-4 w-full max-w-4xl overflow-x-auto pb-4">
          <div className="flex-shrink-0 text-center w-40">
            <button onClick={() => setStep(s => s === 0 ? 1 : 0)} className="px-4 py-3 bg-gray-900 text-white rounded-xl shadow-lg hover:scale-105 transition-transform w-full text-sm font-semibold">
              {step === 0 ? "Simulate Query" : "Query Active..."}
            </button>
          </div>
          
          <ChevronRight className={`flex-shrink-0 text-gray-300 transition-colors ${step >= 1 ? 'text-[#E3000F]' : ''}`} />
          
          <div className="flex-shrink-0 flex flex-col gap-4 w-40">
            <motion.div animate={{ opacity: step >= 1 ? 1 : 0.4, borderColor: step >= 1 ? '#E3000F' : '#e5e7eb' }} className="p-4 border-2 bg-white rounded-xl text-center shadow-sm">
              <span className="font-semibold text-xs">pgvector (Semantic)</span>
            </motion.div>
            <motion.div animate={{ opacity: step >= 1 ? 1 : 0.4, borderColor: step >= 1 ? '#E3000F' : '#e5e7eb' }} className="p-4 border-2 bg-white rounded-xl text-center shadow-sm">
              <span className="font-semibold text-xs">PostgreSQL (Keyword)</span>
            </motion.div>
          </div>

          <ChevronRight className={`flex-shrink-0 text-gray-300 transition-colors ${step >= 2 ? 'text-[#E3000F]' : ''}`} />
          
          <div className="flex-shrink-0 text-center w-32">
             <motion.div animate={{ opacity: step >= 2 ? 1 : 0.4, scale: step >= 2 ? 1.05 : 1 }} className="p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-sm relative">
                {step >= 2 && <div className="absolute inset-0 bg-[#E3000F] opacity-10 rounded-xl animate-ping"></div>}
                <span className="font-bold text-[#E3000F] text-sm">RRF Merge</span>
             </motion.div>
          </div>

          <ChevronRight className={`flex-shrink-0 text-gray-300 transition-colors ${step >= 3 ? 'text-[#E3000F]' : ''}`} />
          
          <div className="flex-shrink-0 text-center w-32">
             <motion.div animate={{ opacity: step >= 3 ? 1 : 0.4 }} className="p-4 bg-gray-900 text-white rounded-xl shadow-sm flex flex-col items-center">
                {step >= 3 ? <Unlock size={20} className="mb-1 text-green-400"/> : <Lock size={20} className="mb-1 text-gray-400"/>}
                <span className="font-semibold text-sm">RBAC Gate</span>
             </motion.div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setStep(s => Math.min(s + 1, 3))}
          disabled={step === 3}
          className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {step === 3 ? "Pipeline Complete" : "Next Step"}
        </button>
      </div>
    </div>
  )
}

const SQLFlow = () => {
  const [stage, setStage] = useState(0);
  const stages = [
    "Semantic Schema Selection",
    "Active DB Probing",
    "Disambiguation Gates",
    "5-Layer Validation"
  ];
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-8 border border-gray-200">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Structured Data: Text-to-SQL Generator</h3>
          <p className="text-gray-600 text-sm">9-Stage Defensive Pipeline eradicating hallucination.</p>
        </div>
        <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
          Zero Hallucination / Read-Only
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full gap-4 min-h-[300px]">
        {stages.map((stg, idx) => (
          <motion.div 
            key={idx}
            className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all duration-300 ${stage >= idx ? 'bg-white border-[#E3000F] shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
          >
            <span className={`font-semibold text-sm ${stage >= idx ? 'text-gray-900' : ''}`}>{stg}</span>
            {stage >= idx && <div className="w-2.5 h-2.5 rounded-full bg-[#E3000F] shadow-[0_0_8px_rgba(227,0,15,0.6)]"></div>}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setStage(s => Math.min(s + 1, 3))}
          disabled={stage === 3}
          className="px-6 py-2 bg-[#E3000F] text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors text-sm font-medium shadow-md"
        >
          {stage === 3 ? "Pipeline Complete" : "Advance Pipeline"}
        </button>
      </div>
    </div>
  )
}

const MarketingFlow = () => {
  const [clustered, setClustered] = useState(false);
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-8 border border-gray-200 overflow-hidden">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Marketing Engine: AI Client Segmentation</h3>
        <p className="text-gray-600 text-sm">Deep Autoencoder + Latent K-Means Clustering on Hugging Face proxy data (focused on GB Download metrics).</p>
      </div>

      <div className="flex-1 relative flex items-center justify-center min-h-[300px]">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(60)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-[#E3000F]' : 'bg-gray-400'}`}
              initial={false}
              animate={{
                x: clustered ? (i % 2 === 0 ? 80 + (Math.random()*60-30) : -80 + (Math.random()*60-30)) : (Math.random() * 250 - 125),
                y: clustered ? (Math.random() * 100 - 50) : (Math.random() * 200 - 100),
                scale: clustered ? 1.5 : 1,
                opacity: clustered ? 1 : 0.6
              }}
              transition={{ duration: 1.5, type: 'spring', bounce: 0.4 }}
            />
          ))}
        </div>
        
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none" stroke="#E3000F" strokeWidth="2">
              <path d="M 0 0 L 120 150 L 120 300 L 180 300 L 180 150 L 300 0 Z" />
            </svg>
        </div>
      </div>

      <div className="mt-8 flex justify-center z-10">
        <button 
          onClick={() => setClustered(!clustered)}
          className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-black transition-colors text-sm font-medium shadow-md"
        >
          {clustered ? "Reset Data" : "Run Clustering (k=2)"}
        </button>
      </div>
    </div>
  )
}

const SupportFlow = () => {
  const [showMask, setShowMask] = useState(false);
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-8 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Support Engine: Refund Fraud Detection</h3>
        <p className="text-gray-600 text-sm">TabNet Supervised Deep Learning resolving 0.13% extreme class imbalance (PaySim data).</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-full max-w-md bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <span className="font-mono text-xs text-gray-500">TXN_ID: #849201A</span>
            <span className="bg-red-100 text-[#E3000F] px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse">Fraud Detected</span>
          </div>

          <div className="space-y-3">
            {[
              { label: "amount", val: "$4,500.00", fraudWeight: 0.05 },
              { label: "oldBalanceOrg", val: "$0.00", fraudWeight: 0.15 },
              { label: "balanceChangeOrig", val: "-$4,500.00", fraudWeight: 0.95 },
              { label: "errorBalanceDest", val: "$4,500.00", fraudWeight: 0.85 },
            ].map((feat, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded relative">
                <span className="font-mono text-xs z-10 relative text-gray-700">{feat.label}</span>
                <span className="font-mono text-xs z-10 relative font-medium">{feat.val}</span>
                
                <motion.div 
                  initial={false}
                  animate={{ opacity: showMask ? feat.fraudWeight : 0 }}
                  className="absolute inset-0 bg-red-100 rounded z-0"
                />
                <motion.div 
                  initial={false}
                  animate={{ opacity: showMask ? 1 : 0 }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold z-10 ${feat.fraudWeight > 0.5 ? 'text-[#E3000F]' : 'text-gray-400'}`}
                >
                  {(feat.fraudWeight * 100).toFixed(0)}%
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setShowMask(!showMask)}
          className={`px-6 py-2 border-2 font-semibold rounded-full transition-colors text-sm ${showMask ? 'bg-red-50 border-[#E3000F] text-[#E3000F]' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
        >
          {showMask ? "Hide Attention Mask" : "Reveal TabNet Attention Mask"}
        </button>
      </div>
    </div>
  )
}


export default function SolutionHub() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <section id="solutions" className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Unified AI Platform</h2>
          <p className="text-gray-600">A multi-agent conversational AI assistant and dashboard ecosystem.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
          <div className="lg:w-64 flex flex-col gap-3">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-[#E3000F] text-white shadow-lg shadow-red-500/25 scale-105' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'text-white' : 'text-[#E3000F]'}`}>
                  {tab.icon}
                </div>
                <span className="font-semibold text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'rag' && <RAGFlow />}
                {activeTab === 'sql' && <SQLFlow />}
                {activeTab === 'marketing' && <MarketingFlow />}
                {activeTab === 'support' && <SupportFlow />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
