import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Slide6_Methodology({ currentStep }) {
  const steps = [
    {
      title: "1. Datasets & Features",
      content: "We utilized three massive, heterogeneous datasets to train specialized detection models:\n\n• Network Flows: CICIDS2017 (2.8M rows, 78 features)\n• HDFS_v1 (LogHub): 578,809 labeled Hadoop block sessions capturing replication/write failures and filesystem anomalies.\n• UEBA (Insider Threat): CMU CERT Insider Threat (10M+ events)"
    },
    {
      title: "2. Algorithm Selection",
      content: "Instead of a monolithic model, we deployed a Multi-Stage Pipeline:\n\n• Stage 1 (Filtering): LightGBM for rapid benign vs. malicious binary classification.\n• Stage 2 (Multi-class): XGBoost for precise attack categorization (DDoS, Brute Force, Web Attack).\n• Stage 3 (Anomaly): Isolation Forest for Zero-Day and UEBA detection."
    },
    {
      title: "3. Deep Learning Integration",
      content: "For complex, temporal data (like SSH sequences and HDFS system logs), we implemented Deep Learning architectures:\n\n• PyTorch Bi-LSTM: Captures bidirectional temporal dependencies in authentication attempts.\n• CNN-BiLSTM: Combines spatial feature extraction with time-series memory."
    },
    {
      title: "4. Training & Validation",
      content: "All models underwent rigorous hyperparameter tuning and cross-validation.\n\n• XGBoost achieved 99.8% accuracy on network flows.\n• Isolation Forest successfully flagged injected Zero-Day anomalies.\n• Real-time inference latency is kept strictly under 50ms per flow."
    }
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center items-center max-w-6xl">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold mb-12 text-center"
      >
        Project <span className="text-[#9775FA]">Methodology</span>
      </motion.h2>

      <div className="grid grid-cols-2 gap-8 w-full">
        <AnimatePresence>
          {steps.map((step, idx) => (
            currentStep >= idx && (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[#161B22] border border-[#30363D] p-8 rounded-xl shadow-xl"
              >
                <h3 className="text-2xl font-bold text-[#9775FA] mb-4">{step.title}</h3>
                <p className="text-[#F0F6FC] leading-relaxed whitespace-pre-line text-lg">
                  {step.content}
                </p>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
