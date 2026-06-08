import React from 'react';
import { motion } from 'framer-motion';

export default function Slide9_Demo() {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-5xl h-full">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-32 h-32 rounded-full bg-[#34D399] mb-12 blur-[80px] absolute z-0"
      />
      
      <motion.h1 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-tight z-10"
      >
        Live <span className="text-[#34D399]">Platform Demo</span>
      </motion.h1>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="text-xl md:text-2xl text-gray-400 space-y-4 z-10 font-light"
      >
        <p>Transitioning to the WebGL Interactive Dashboard...</p>
      </motion.div>
    </div>
  );
}
