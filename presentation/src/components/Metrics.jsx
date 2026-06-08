import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const AnimatedCounter = ({ value, isPercentage = false, decimals = 4 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000; 
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = start + (value - start) * easeOut;
        
        setDisplayValue(currentVal);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {displayValue.toFixed(decimals)}
      {isPercentage ? '%' : ''}
    </span>
  );
};

export default function Metrics() {
  return (
    <section id="results" className="py-24 bg-gray-900 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E3000F] opacity-20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Models Results & Interpretation</h2>
          <p className="text-gray-400">Backed by empirical evaluation on proxy datasets.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Marketing */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-800/60 border border-gray-700 p-8 rounded-3xl backdrop-blur-md hover:border-gray-600 transition-colors"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-100 border-b border-gray-700/50 pb-4">Marketing Segmentation (Autoencoder)</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Silhouette Coeff</div>
                <div className="text-3xl font-extrabold text-[#E3000F]"><AnimatedCounter value={0.2435} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Davies-Bouldin</div>
                <div className="text-3xl font-extrabold text-white"><AnimatedCounter value={2.2537} /></div>
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 text-sm text-gray-300 leading-relaxed">
              <span className="text-white font-semibold block mb-1">Interpretation:</span>
              While mathematically modest, these scores reflect the inherently continuous, overlapping nature of real-world telecom usage behaviors. The Autoencoder successfully finds the most actionable divide (k=2) despite the noise.
            </div>
          </motion.div>

          {/* Fraud */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/60 border border-gray-700 p-8 rounded-3xl backdrop-blur-md hover:border-gray-600 transition-colors"
          >
            <h3 className="text-xl font-bold mb-6 text-gray-100 border-b border-gray-700/50 pb-4">Fraud Detection (TabNet)</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">AUC-ROC</div>
                <div className="text-3xl font-extrabold text-[#E3000F]"><AnimatedCounter value={0.9699} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">MCC</div>
                <div className="text-3xl font-extrabold text-white"><AnimatedCounter value={0.7037} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Precision</div>
                <div className="text-3xl font-extrabold text-[#E3000F]"><AnimatedCounter value={90.5} isPercentage={true} decimals={1}/></div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">F1-Score</div>
                <div className="text-3xl font-extrabold text-white"><AnimatedCounter value={0.68} decimals={2} /></div>
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 text-sm text-gray-300 leading-relaxed">
              <span className="text-white font-semibold block mb-1">Interpretation:</span>
              The high MCC proves genuine learning of complex fraud patterns (0.13% imbalance). Precision (90.5%) was heavily prioritized to ensure agents are only alerted to high-confidence fraud, preventing "alert fatigue".
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
