import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Database, Network } from 'lucide-react';

export default function Slide8_AgenticLLM() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold mb-10 text-center"
      >
        <span className="text-[#A78BFA]">Agentic LLM</span> Architecture
      </motion.h2>

      <div className="w-full h-[500px] bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-10 relative flex flex-col items-center">
        <p className="text-[#8B949E] text-lg text-center mb-12 max-w-3xl">
          Instead of replacing analysts, the LLM acts as an autonomous agent that enriches alerts with historical context via Retrieval-Augmented Generation (RAG).
        </p>

        <div className="flex items-center justify-between w-full px-16 relative z-10">
          
          <div className="flex flex-col items-center text-center w-64">
            <div className="w-24 h-24 bg-[#E3000F]/10 border-2 border-[#E3000F] rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(227,0,15,0.2)]">
              <Network className="w-10 h-10 text-[#E3000F]" />
            </div>
            <h3 className="text-[#F0F6FC] font-bold text-xl mb-2">Live Alert Stream</h3>
            <p className="text-[#8B949E] text-sm">XGBoost & PyTorch continuously stream verified attacks.</p>
          </div>

          <div className="w-32 h-1 bg-gradient-to-r from-[#E3000F] to-[#A78BFA] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rotate-45 border-t-2 border-r-2 border-[#A78BFA]"></div>
          </div>

          <div className="flex flex-col items-center text-center w-64">
            <div className="w-24 h-24 bg-[#A78BFA]/10 border-2 border-[#A78BFA] rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(167,139,250,0.3)]">
              <Bot className="w-12 h-12 text-[#A78BFA]" />
            </div>
            <h3 className="text-[#A78BFA] font-bold text-xl mb-2">LangChain Agent</h3>
            <p className="text-[#8B949E] text-sm">LLM receives alert context and constructs search queries.</p>
          </div>

          <div className="w-32 h-1 bg-gradient-to-r from-[#A78BFA] to-[#4DABF7] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rotate-45 border-t-2 border-r-2 border-[#4DABF7]"></div>
          </div>

          <div className="flex flex-col items-center text-center w-64">
            <div className="w-24 h-24 bg-[#4DABF7]/10 border-2 border-[#4DABF7] rounded-lg flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(77,171,247,0.2)]">
              <Database className="w-10 h-10 text-[#4DABF7]" />
            </div>
            <h3 className="text-[#F0F6FC] font-bold text-xl mb-2">ChromaDB (RAG)</h3>
            <p className="text-[#8B949E] text-sm">Vector similarity search retrieves identical past incidents.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
