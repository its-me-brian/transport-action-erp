import React from 'react';
import { motion } from 'motion/react';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

export default function MotionCard({ children, className = '', onClick, role, 'aria-label': ariaLabel }: MotionCardProps) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.15 }}
      className={`transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
}
