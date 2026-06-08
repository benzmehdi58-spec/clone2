import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, GitMerge } from 'lucide-react';

export default function Slide2_Problem({ currentStep }) {
  const problems = [
    {
      icon: <Activity className="w-8 h-8 text-[#E3000F]" />,
      title: "Alert Fatigue",
      desc: "Security analysts are overwhelmed by millions of raw logs daily, leading to ignored critical alerts and burnout."
    },
    {
      icon: <GitMerge className="w-8 h-8 text-[#E3000F]" />,
      title: "Complex Threat Landscapes",
      desc: "Modern attacks span across Network, SSH, UEBA, and HDFS simultaneously, making isolated detection systems obsolete."
    },
    {
      icon: <ShieldAlert className="w-8 h-8 text-[#E3000F]" />,
      title: "Lack of Immediate Context",
      desc: "When an anomaly is detected, analysts spend hours manually researching the threat instead of immediately remediating it."
    }
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-6xl font-bold mb-16 text-center"
      >
        The <span className="text-[#E3000F]">Problem</span>
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <AnimatePresence>
          {problems.map((prob, idx) => (
            currentStep >= idx && (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-[#161B22] border border-[#30363D] p-8 rounded-xl shadow-xl flex flex-col items-center text-center"
              >
                <div className="bg-[#E3000F]/10 p-4 rounded-full mb-6 border border-[#E3000F]/30">
                  {prob.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-[#F0F6FC]">{prob.title}</h3>
                <p className="text-[#8B949E] leading-relaxed text-lg">{prob.desc}</p>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
