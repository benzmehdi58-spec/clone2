import React from 'react';
import { motion } from 'framer-motion';

export default function Slide4_UseCaseDiagram() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold mb-10 text-center"
      >
        Platform <span className="text-[#E3000F]">Use Case</span> Diagram
      </motion.h2>

      <div className="w-full h-[600px] bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-6 relative overflow-hidden flex items-center justify-center">
        {/* Actors */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-12">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#4DABF7]/20 border-2 border-[#4DABF7] flex items-center justify-center">
              👤
            </div>
            <span className="mt-2 text-[#4DABF7] font-bold text-sm">Analyst</span>
          </div>
        </div>

        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-12">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#E3000F]/20 border-2 border-[#E3000F] flex items-center justify-center">
              🤖
            </div>
            <span className="mt-2 text-[#E3000F] font-bold text-sm">AI Pipelines</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#34D399]/20 border-2 border-[#34D399] flex items-center justify-center">
              🧠
            </div>
            <span className="mt-2 text-[#34D399] font-bold text-sm">LangChain</span>
          </div>
        </div>

        {/* System Boundary */}
        <div className="w-[60%] h-[90%] border-2 border-[#30363D] border-dashed rounded-3xl p-6 flex flex-col">
          <h3 className="text-center text-[#8B949E] font-bold tracking-widest uppercase mb-4">CyberAI-SOC Platform</h3>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Analyst Use Cases */}
            <div className="flex flex-col gap-3">
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">Biometric Login</div>
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">Dashboard Monitoring</div>
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">Live WebGL Sim</div>
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">Log Explorer</div>
              <div className="bg-[#0D1117] border border-[#E3000F]/40 rounded-full py-2 px-4 text-center text-sm text-[#E3000F] font-bold">Monitor Active Alerts</div>
              <div className="bg-[#0D1117] border border-[#4DABF7]/40 rounded-full py-2 px-4 text-center text-sm text-[#4DABF7]">Chat w/ AI Assistant</div>
            </div>

            {/* System Use Cases */}
            <div className="flex flex-col gap-3">
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">Ingest Telemetry</div>
              <div className="bg-[#0D1117] border border-[#E3000F]/40 rounded-full py-2 px-4 text-center text-sm text-[#E3000F] font-bold">Detect Anomalies</div>
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">MITRE ATT&CK Mapping</div>
              <div className="bg-[#0D1117] border border-[#34D399]/40 rounded-full py-2 px-4 text-center text-sm text-[#34D399]">Correlate & RAG Search</div>
              <div className="bg-[#0D1117] border border-[#30363D] rounded-full py-2 px-4 text-center text-sm text-[#F0F6FC]">WebSocket Streaming</div>
            </div>
          </div>
        </div>
        
        {/* Connectors (Simulated with absolute positioned lines) */}
        <div className="absolute top-1/2 left-[15%] w-[15%] h-px bg-[#4DABF7]/50"></div>
        <div className="absolute top-1/3 right-[15%] w-[15%] h-px bg-[#E3000F]/50"></div>
        <div className="absolute top-[60%] right-[15%] w-[15%] h-px bg-[#34D399]/50"></div>
      </div>
    </div>
  );
}
