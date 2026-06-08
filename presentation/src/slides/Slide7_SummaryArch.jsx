import React from 'react';
import { motion } from 'framer-motion';

export default function Slide7_SummaryArch() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold mb-10 text-center"
      >
        Project <span className="text-[#34D399]">Architecture Summary</span>
      </motion.h2>

      <div className="w-full h-[600px] bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-6 relative flex flex-col items-center">
        
        <div className="flex w-full justify-between mt-8 px-12 z-10">
          {/* Data Sources Layer */}
          <div className="flex flex-col gap-6 w-1/4">
            <h3 className="text-[#8B949E] text-center font-bold tracking-widest uppercase mb-2">1. Data Ingestion</h3>
            <div className="bg-[#0D1117] border-2 border-[#4DABF7] rounded-lg py-4 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(77,171,247,0.2)]">Network Flows</div>
            <div className="bg-[#0D1117] border-2 border-[#9775FA] rounded-lg py-4 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(151,117,250,0.2)]">SSH Auth Logs</div>
            <div className="bg-[#0D1117] border-2 border-[#D29922] rounded-lg py-4 px-2 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(210,153,34,0.2)]">HDFS LogHub / UEBA</div>
          </div>

          {/* AI Layer */}
          <div className="flex flex-col gap-6 w-1/3">
            <h3 className="text-[#8B949E] text-center font-bold tracking-widest uppercase mb-2">2. AI Detection Engine</h3>
            <div className="bg-[#E3000F]/10 border-2 border-[#E3000F] rounded-lg py-8 px-4 text-center shadow-[0_0_20px_rgba(227,0,15,0.2)]">
              <span className="text-[#E3000F] font-bold block mb-2 text-xl">Threat Classification</span>
              <span className="text-[#F0F6FC] text-sm">XGBoost & LightGBM<br/>PyTorch Bi-LSTM<br/>Isolation Forest</span>
            </div>
            <div className="bg-[#0D1117] border border-[#30363D] rounded-lg py-3 text-center text-[#8B949E] text-sm">
              mitre_mapper.py (ATT&CK Mapping)
            </div>
          </div>

          {/* Interface Layer */}
          <div className="flex flex-col gap-6 w-1/4">
            <h3 className="text-[#8B949E] text-center font-bold tracking-widest uppercase mb-2">3. React Dashboard</h3>
            <div className="bg-[#0D1117] border-2 border-[#34D399] rounded-lg py-4 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(52,211,153,0.2)]">Active Alerts UI</div>
            <div className="bg-[#0D1117] border-2 border-[#34D399] rounded-lg py-4 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(52,211,153,0.2)]">WebGL Simulation</div>
            <div className="bg-[#0D1117] border-2 border-[#34D399] rounded-lg py-4 text-center text-[#F0F6FC] font-bold shadow-[0_0_15px_rgba(52,211,153,0.2)]">LangChain Chatbot</div>
          </div>
        </div>

        {/* Connectors */}
        <div className="absolute top-[30%] left-[28%] w-[10%] h-1 bg-gradient-to-r from-[#4DABF7] to-[#E3000F]"></div>
        <div className="absolute top-[48%] left-[28%] w-[10%] h-1 bg-gradient-to-r from-[#9775FA] to-[#E3000F]"></div>
        <div className="absolute top-[66%] left-[28%] w-[10%] h-1 bg-gradient-to-r from-[#D29922] to-[#E3000F]"></div>

        <div className="absolute top-[40%] right-[28%] w-[10%] h-1 bg-gradient-to-r from-[#E3000F] to-[#34D399]"></div>
        <div className="absolute top-[58%] right-[28%] w-[10%] h-1 bg-gradient-to-r from-[#E3000F] to-[#34D399]"></div>

      </div>
    </div>
  );
}
