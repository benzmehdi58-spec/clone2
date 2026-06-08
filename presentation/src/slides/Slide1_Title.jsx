import React from 'react';
import { motion } from 'framer-motion';

export default function Slide1_Title() {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-5xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-32 h-32 rounded-full bg-[#E3000F] mb-12 blur-[80px] absolute z-0"
      />
      
      <motion.h1 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-6xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-tight z-10"
      >
        CyberAI-SOC: <br />
        <span className="text-gradient-red">Next-Generation Agentic Security Operations Center</span>
      </motion.h1>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="text-xl md:text-2xl text-gray-400 space-y-4 z-10 font-light"
      >
        <p><strong className="text-white">Authors:</strong> Mehdi Benzineb & Ait Saadi Mostafa</p>
        <p><strong className="text-white">Supervisor:</strong> Alaa Eddine Belfedhal</p>
      </motion.div>
    </div>
  );
}
