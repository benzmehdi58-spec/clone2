import { motion } from 'framer-motion';
import { Network } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-white">
      {/* Ambient background effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(227,0,15,0.04)_0,rgba(255,255,255,1)_100%)]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-6">
            <div className="bg-red-50 text-[#E3000F] px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-red-100 flex items-center gap-2">
              <Network size={16} />
              Djezzy Telecom
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
            Design & Implementation of an <br />
            <span className="text-gradient">Intelligent Telecom Ecosystem</span>
          </h1>
          
          <div className="text-lg md:text-xl text-gray-600 mb-12 flex flex-col gap-2">
            <p><strong>Authors:</strong> Abdelssamad MALEK CHELIH & Laid Farouk BELAZREG</p>
            <p><strong>Supervision:</strong> Dr. Soumia BENBAKRETI</p>
          </div>

          <div className="glass rounded-2xl p-6 max-w-3xl mx-auto shadow-sm">
            <h3 className="text-gray-900 font-semibold mb-2">Internship Recap</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Analyzed Data Science, Big Data, BI, Security, Commercial, and NOC departments. <br/>
              <strong>Key Takeaway:</strong> Bridging the gap between academic AI theory and massive-scale, real-time enterprise operations.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
