import { motion, AnimatePresence } from 'framer-motion';
import { Play, MessageSquare, DatabaseZap, Users, ShieldAlert, ScanFace, Loader2 } from 'lucide-react';
import { useState } from 'react';

const demoApps = [
  { name: "Text-to-SQL Generator", icon: <DatabaseZap /> },
  { name: "Edge AI Face Auth", icon: <ScanFace /> },
  { name: "Query Routing (RAG)", icon: <MessageSquare /> },
  { name: "Marketing Dashboard", icon: <Users /> },
  { name: "Customer Support Hub", icon: <ShieldAlert /> },
];

export default function Demo() {
  const [launching, setLaunching] = useState(null);

  const handleLaunch = (idx) => {
    setLaunching(idx);
    setTimeout(() => setLaunching(null), 2500);
  };

  return (
    <section id="demo" className="py-32 bg-gray-50 border-t border-gray-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(227,0,15,0.03),transparent_50%)]"></div>
      
      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        <div className="mb-16">
          <span className="bg-red-100 text-[#E3000F] px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4 inline-block">Live Platform</span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Ready for Deployment</h2>
          <p className="text-gray-600 text-lg">Launch interactive platform components for the live demo.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {demoApps.map((app, idx) => (
            <button
              key={idx}
              onClick={() => handleLaunch(idx)}
              disabled={launching !== null}
              className={`group relative px-8 py-5 bg-white border rounded-2xl flex items-center gap-4 transition-all duration-300 w-full sm:w-auto shadow-sm
                ${launching === idx ? 'border-[#E3000F] ring-4 ring-red-50/50 scale-105' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
                ${launching !== null && launching !== idx ? 'opacity-50 grayscale cursor-not-allowed' : ''}
              `}
            >
              <div className={`p-3 rounded-xl transition-colors duration-300 ${launching === idx ? 'bg-[#E3000F] text-white' : 'bg-gray-50 text-gray-600 group-hover:bg-red-50 group-hover:text-[#E3000F]'}`}>
                {app.icon}
              </div>
              
              <span className={`font-semibold text-left transition-colors ${launching === idx ? 'text-[#E3000F]' : 'text-gray-900'}`}>
                {launching === idx ? "Initializing System..." : app.name}
              </span>
              
              <div className="absolute right-6">
                <AnimatePresence mode="wait">
                  {launching === idx ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Loader2 size={20} className="text-[#E3000F] animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play size={20} className="text-gray-400 group-hover:text-[#E3000F]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
