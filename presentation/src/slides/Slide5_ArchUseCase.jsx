import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Slide5_ArchUseCase({ currentStep }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold mb-10 text-center"
      >
        <span className="text-[#34D399]">System Architecture</span> & Chatbot Sequence
      </motion.h2>

      <div className="relative w-full h-[600px] bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-8 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="arch"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <h3 className="text-3xl font-bold text-[#F0F6FC] mb-4">High-Level Flow</h3>
              <div className="flex items-center gap-4 text-[#8B949E] font-mono text-sm">
                <div className="p-6 bg-[#0D1117] border border-[#30363D] rounded-lg">Raw Logs (Network, SSH, HDFS)</div>
                <div className="w-12 h-1 bg-gradient-to-r from-[#30363D] to-[#E3000F]"></div>
                <div className="p-6 bg-[#E3000F]/10 border border-[#E3000F]/50 rounded-lg text-[#E3000F] font-bold shadow-[0_0_15px_rgba(227,0,15,0.2)]">AI Detection Engine</div>
                <div className="w-12 h-1 bg-gradient-to-r from-[#E3000F] to-[#4DABF7]"></div>
                <div className="p-6 bg-[#4DABF7]/10 border border-[#4DABF7]/50 rounded-lg text-[#4DABF7] font-bold">LangChain Agent</div>
                <div className="w-12 h-1 bg-gradient-to-r from-[#4DABF7] to-[#34D399]"></div>
                <div className="p-6 bg-[#34D399]/10 border border-[#34D399]/50 rounded-lg text-[#34D399] font-bold">Analyst Dashboard</div>
              </div>
              <p className="text-[#8B949E] max-w-2xl text-lg mt-8">
                The architecture isolates the heavy data processing to a FastAPI backend, running complex AI pipelines asynchronously, while WebSockets stream only critical findings to the React frontend.
              </p>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="seq"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full flex flex-col"
            >
              <h3 className="text-2xl font-bold text-[#4DABF7] mb-6 text-center">Chatbot Sequence Diagram</h3>
              
              {/* Custom Sequence Diagram visually constructed */}
              <div className="flex-1 relative border-t border-[#30363D] pt-4 overflow-y-auto">
                <div className="flex justify-between px-8 text-xs font-bold text-[#8B949E] uppercase mb-4">
                  <span className="w-1/5 text-center">Analyst (UI)</span>
                  <span className="w-1/5 text-center text-[#4DABF7]">FastAPI</span>
                  <span className="w-1/5 text-center text-[#34D399]">SQLite (History)</span>
                  <span className="w-1/5 text-center text-[#E3000F]">ChromaDB (RAG)</span>
                  <span className="w-1/5 text-center text-[#9775FA]">Claude LLM API</span>
                </div>
                
                <div className="absolute top-12 bottom-0 left-[10%] w-px bg-[#30363D] border-dashed border-l border-[#8B949E]/30"></div>
                <div className="absolute top-12 bottom-0 left-[30%] w-px bg-[#30363D] border-dashed border-l border-[#4DABF7]/30"></div>
                <div className="absolute top-12 bottom-0 left-[50%] w-px bg-[#30363D] border-dashed border-l border-[#34D399]/30"></div>
                <div className="absolute top-12 bottom-0 left-[70%] w-px bg-[#30363D] border-dashed border-l border-[#E3000F]/30"></div>
                <div className="absolute top-12 bottom-0 left-[90%] w-px bg-[#30363D] border-dashed border-l border-[#9775FA]/30"></div>

                <div className="space-y-7 mt-8 relative z-10 px-8">
                  {/* 1. Analyst -> FastAPI */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[10%]">
                    <div className="w-[25%] border-t-2 border-[#4DABF7] relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">1. Sends Question</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#4DABF7] rotate-45"></div>
                    </div>
                  </div>
                  
                  {/* 2. FastAPI -> SQLite */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[30%]">
                    <div className="w-[25%] border-t-2 border-[#34D399] relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">2. Fetch last 6 msgs</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#34D399] rotate-45"></div>
                    </div>
                  </div>

                  {/* 3. FastAPI -> Claude (Classify & Rewrite) */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[30%]">
                    <div className="w-[75%] border-t-2 border-[#9775FA] relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">3. Classify & Rewrite Query</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#9775FA] rotate-45"></div>
                    </div>
                  </div>

                  {/* 4. FastAPI -> ChromaDB */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[30%]">
                    <div className="w-[50%] border-t-2 border-[#E3000F] relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">4. Similarity Search (CVEs/Runbooks)</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#E3000F] rotate-45"></div>
                    </div>
                  </div>

                  {/* 5. FastAPI -> Claude (Full prompt) */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[30%]">
                    <div className="w-[75%] border-t-2 border-[#9775FA] relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">5. Send Prompt (Query+Hist+Context)</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#9775FA] rotate-45"></div>
                    </div>
                  </div>

                  {/* 6. Claude -> Analyst (SSE) */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[10%]">
                    <div className="w-[100%] border-t-2 border-[#4DABF7] relative border-dashed">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">6. Stream HTTP Response (SSE chunk-by-chunk)</span>
                      <div className="absolute -left-2 -top-1.5 w-3 h-3 border-b-2 border-l-2 border-[#4DABF7] rotate-45"></div>
                    </div>
                  </div>

                  {/* 7. FastAPI -> SQLite (Save) */}
                  <div className="flex items-center text-[10px] text-[#F0F6FC] ml-[30%]">
                    <div className="w-[25%] border-t-2 border-[#34D399] relative border-dashed">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">7. Save Q/A to DB</span>
                      <div className="absolute -right-2 -top-1.5 w-3 h-3 border-t-2 border-r-2 border-[#34D399] rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
