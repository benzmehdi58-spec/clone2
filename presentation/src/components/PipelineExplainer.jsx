import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PipelineExplainer({ imageSrc, figureComponent, stepsData, currentStep }) {
  // stepsData: [{ x: '20%', y: '10%', w: '40%', h: '30%', title: '...', desc: '...' }]
  
  // Step 0 is usually just the image without highlights.
  // So currentStep=0 => nothing highlighted. currentStep=1 => stepsData[0].
  const activeIndex = currentStep - 1;
  const activeHotspot = activeIndex >= 0 ? stepsData[activeIndex] : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      {/* Base Architecture Image / Component */}
      {figureComponent ? (
        <div className="max-h-full max-w-full relative z-10 w-full h-full">
          {figureComponent}
        </div>
      ) : (
        <motion.img 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          src={imageSrc} 
          alt="Architecture Pipeline" 
          className="max-h-full max-w-full object-contain relative z-10 invert drop-shadow-[0_0_15px_rgba(230,0,0,0.5)]" 
        />
      )}

      {/* Dimmer Overlay */}
      <AnimatePresence>
        {activeHotspot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black z-20"
          />
        )}
      </AnimatePresence>

      {/* Highlights & Tooltips */}
      <AnimatePresence>
        {activeHotspot && (
          <motion.div
            key={activeIndex}
            className="absolute z-30 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            style={{
              top: activeHotspot.y,
              left: activeHotspot.x,
              width: activeHotspot.w,
              height: activeHotspot.h,
            }}
          >
            {/* Glowing Ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-[#E60000] shadow-[0_0_40px_rgba(230,0,0,0.8)] bg-white/5" />
            
            {/* Tooltip Card */}
            <motion.div 
              className="absolute top-full left-1/2 -translate-x-1/2 mt-8 w-96 glass-red p-6 rounded-2xl text-center pointer-events-none"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-white font-bold text-2xl mb-2">{activeHotspot.title}</h4>
              <p className="text-gray-300 text-lg leading-relaxed">{activeHotspot.desc}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
