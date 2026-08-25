import React from 'react';
import { motion } from 'motion/react';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function MotionCard({ children, className = '', onClick }: MotionCardProps) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.15 }}
      className={`transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
