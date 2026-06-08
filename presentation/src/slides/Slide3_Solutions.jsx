import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, DatabaseZap, SearchCheck } from 'lucide-react';

export default function Slide3_Solutions({ currentStep }) {
  const solutions = [
    {
      icon: <BrainCircuit className="w-10 h-10 text-[#4DABF7]" />,
      title: "Multi-Model AI Pipelines",
      desc: "Implement specialized ML models (XGBoost, Isolation Forest, PyTorch LSTM) to autonomously filter and classify threats in real-time across multiple data streams."
    },
    {
      icon: <DatabaseZap className="w-10 h-10 text-[#4DABF7]" />,
      title: "MITRE ATT&CK Mapping",
      desc: "Automatically translate raw network anomalies into standardized cyber threat intelligence, pinpointing the exact tactic and technique."
    },
    {
      icon: <SearchCheck className="w-10 h-10 text-[#4DABF7]" />,
      title: "Agentic LLM RAG System",
      desc: "Deploy a LangChain agent hooked into a ChromaDB vector database to instantly provide historical context and automated remediation summaries for every alert."
    }
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-6xl font-bold mb-16 text-center"
      >
        Proposed <span className="text-[#4DABF7]">Solutions</span>
      </motion.h2>

      <div className="space-y-6 w-full max-w-4xl">
        <AnimatePresence>
          {solutions.map((sol, idx) => (
            currentStep >= idx && (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-[#161B22] border border-[#30363D] p-6 rounded-xl shadow-lg flex items-center gap-6"
              >
                <div className="bg-[#4DABF7]/10 p-4 rounded-xl border border-[#4DABF7]/30 shrink-0">
                  {sol.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-[#F0F6FC]">{sol.title}</h3>
                  <p className="text-[#8B949E] text-lg leading-relaxed">{sol.desc}</p>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
