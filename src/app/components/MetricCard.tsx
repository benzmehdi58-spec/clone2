import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  delay?: number;
  children?: ReactNode;
}

const VARIANTS = {
  default: { iconColor: '#8B949E', iconBg: 'rgba(48,54,61,0.6)',    glow: '' },
  danger:  { iconColor: '#E3000F', iconBg: 'rgba(227,0,15,0.1)',    glow: '0 0 30px rgba(227,0,15,0.12)' },
  warning: { iconColor: '#FBBF24', iconBg: 'rgba(251,191,36,0.1)',  glow: '0 0 30px rgba(251,191,36,0.08)' },
  success: { iconColor: '#34D399', iconBg: 'rgba(52,211,153,0.1)',  glow: '' },
  info:    { iconColor: '#60A5FA', iconBg: 'rgba(96,165,250,0.1)',  glow: '' },
} as const;

export function MetricCard({ title, value, subtitle, icon: Icon, variant = 'default', delay = 0, children }: MetricCardProps) {
  const v = VARIANTS[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className="glass-card rounded-xl p-5 transition-all duration-300"
      style={{ boxShadow: v.glow || undefined }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg" style={{ background: v.iconBg }}>
          <Icon className="w-5 h-5" style={{ color: v.iconColor }} />
        </div>
        {variant === 'danger' && (
          <span className="w-2 h-2 rounded-full bg-[#E3000F] mt-0.5 animate-pulse-red" />
        )}
      </div>
      <div className="text-foreground text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="text-muted-foreground text-sm mt-1">{title}</div>
      {subtitle && <div className="text-muted-foreground/60 text-xs mt-0.5">{subtitle}</div>}
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
}
