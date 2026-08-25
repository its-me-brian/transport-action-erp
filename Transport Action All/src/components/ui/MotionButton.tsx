import React from 'react';
import { motion } from 'motion/react';

interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const variantClasses = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container',
  secondary: 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high',
  ghost: 'text-on-surface-variant hover:bg-surface-container',
};

export default function MotionButton({ 
  children, 
  variant = 'secondary', 
  className = '',
  disabled,
  ...props 
}: MotionButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
