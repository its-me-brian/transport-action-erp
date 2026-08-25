import { motion } from 'motion/react';

const shimmer = {
  hidden: { opacity: 0.4 },
  visible: {
    opacity: 0.7,
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      variants={shimmer}
      initial="hidden"
      animate="visible"
      className={`bg-surface-container-high rounded ${className}`}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          variants={shimmer}
          initial="hidden"
          animate="visible"
          className="h-3 rounded bg-surface-container-high"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  return (
    <motion.div
      variants={shimmer}
      initial="hidden"
      animate="visible"
      className={`${sizeClass} rounded-full bg-surface-container-high shrink-0`}
    />
  );
}
