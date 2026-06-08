import { motion } from 'framer-motion';
import { Database, ShieldCheck } from 'lucide-react';

export default function Future() {
  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Future Perspectives at Djezzy</h2>
          <p className="text-gray-600">Scaling the MVP into production.</p>
        </div>
        
        <div className="relative">
          {/* Vertical Line */}
          <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-0.5 bg-gray-100 -translate-x-1/2"></div>
          
          <div className="space-y-16">
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative flex flex-col md:flex-row items-center gap-8 group"
            >
              <div className="md:w-1/2 md:text-right pr-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#E3000F] transition-colors">Transfer Learning on Real Data</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Transitioning the Deep Learning models (Autoencoder & TabNet) from public proxy datasets to Djezzy's proprietary data warehouse. Fine-tuning weights on actual customer usage logs and live VAS abuse histories.
                </p>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-100 group-hover:border-[#E3000F] flex items-center justify-center z-10 shadow-sm transition-colors duration-500">
                <Database size={24} className="text-gray-400 group-hover:text-[#E3000F] transition-colors duration-500" />
              </div>
              <div className="md:w-1/2 pl-8 hidden md:block">
                  <div className="h-[2px] w-16 bg-gray-100 group-hover:bg-[#E3000F] transition-colors duration-500"></div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative flex flex-col md:flex-row-reverse items-center gap-8 group"
            >
              <div className="md:w-1/2 md:text-left pl-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">Local-Models-First Approach</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Migrating from external APIs to locally hosted open-weight LLMs (like Llama 3 / Mistral). Ensures absolute <strong className="text-gray-900">security and data sovereignty</strong> for sensitive telecommunications data.
                </p>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-100 group-hover:border-green-500 flex items-center justify-center z-10 shadow-sm transition-colors duration-500">
                <ShieldCheck size={24} className="text-gray-400 group-hover:text-green-600 transition-colors duration-500" />
              </div>
              <div className="md:w-1/2 pr-8 hidden md:flex justify-end">
                 <div className="h-[2px] w-16 bg-gray-100 group-hover:bg-green-500 transition-colors duration-500"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
