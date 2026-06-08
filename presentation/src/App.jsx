import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Shield } from 'lucide-react';

import Slide1_Title from './slides/Slide1_Title';
import Slide2_Problem from './slides/Slide2_Problem';
import Slide3_Solutions from './slides/Slide3_Solutions';
import Slide4_UseCaseDiagram from './slides/Slide4_UseCaseDiagram';
import Slide5_ArchUseCase from './slides/Slide5_ArchUseCase';
import Slide6_Methodology from './slides/Slide6_Methodology';
import Slide7_SummaryArch from './slides/Slide7_SummaryArch';
import Slide8_AgenticLLM from './slides/Slide8_AgenticLLM';
import Slide9_Demo from './slides/Slide9_Demo';

const slides = [
  { component: Slide1_Title, steps: 1 },
  { component: Slide2_Problem, steps: 3 },
  { component: Slide3_Solutions, steps: 3 },
  { component: Slide4_UseCaseDiagram, steps: 1 },
  { component: Slide5_ArchUseCase, steps: 2 },
  { component: Slide6_Methodology, steps: 4 },
  { component: Slide7_SummaryArch, steps: 1 },
  { component: Slide8_AgenticLLM, steps: 1 },
  { component: Slide9_Demo, steps: 1 }
];

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = useCallback(() => {
    const slideMeta = slides[currentSlide];
    if (currentStep < slideMeta.steps - 1) {
      setCurrentStep(s => s + 1);
    } else if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1);
      setCurrentStep(0);
    }
  }, [currentSlide, currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else if (currentSlide > 0) {
      setCurrentSlide(s => s - 1);
      setCurrentStep(slides[currentSlide - 1].steps - 1);
    }
  }, [currentSlide, currentStep]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="w-screen h-screen bg-[#0D1117] text-white overflow-hidden relative font-sans">
      <div className="absolute top-10 left-10 flex items-center gap-3 z-50">
        <Shield
          className="w-8 h-8 text-[#E3000F]"
          style={{ filter: 'drop-shadow(0 0 8px rgba(227,0,15,0.7))' }}
        />
        <span className="font-bold text-[18px] tracking-tight text-[#F0F6FC]">
          Cyber<span className="text-[#E3000F]">AI</span>
        </span>
      </div>
      
      <div className="absolute bottom-10 right-10 z-50 text-gray-500 font-mono text-xl">
        {currentSlide + 1} / {slides.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full flex items-center justify-center p-16"
        >
          <CurrentSlideComponent currentStep={currentStep} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
