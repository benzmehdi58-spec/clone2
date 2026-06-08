import { motion } from 'framer-motion';
import { Database, Code2, AlertTriangle, Target } from 'lucide-react';

const problems = [
  {
    icon: <Database className="text-[#E3000F]" size={32} />,
    title: "Data Fragmentation",
    desc: "Siloed structured databases (Oracle/PostgreSQL) and unstructured documents."
  },
  {
    icon: <Code2 className="text-[#E3000F]" size={32} />,
    title: "SQL Expertise Barrier",
    desc: "Non-technical staff depend entirely on IT for basic data retrieval."
  },
  {
    icon: <AlertTriangle className="text-[#E3000F]" size={32} />,
    title: "VAS Refund Abuse",
    desc: "Revenue leakage from subscription/cancellation loops without real-time fraud scoring."
  },
  {
    icon: <Target className="text-[#E3000F]" size={32} />,
    title: "Suboptimal Marketing",
    desc: "Outdated RFM metrics failing to accurately segment modern data users."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ProblemStatement() {
  return (
    <section id="problems" className="py-24 bg-gray-50 relative border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Operational Bottlenecks</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Direct observation revealed critical pain points in existing workflows.</p>
        </div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {problems.map((prob, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className="group relative bg-white border border-gray-200 p-8 rounded-2xl transition-all duration-300 hover:glow-red-active cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="mb-6 p-4 bg-red-50 rounded-xl inline-block group-hover:scale-110 transition-transform duration-300">
                  {prob.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{prob.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                  {prob.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
