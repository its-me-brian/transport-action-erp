/**
 * MobileSkeleton — Loading skeleton for mobile list views.
 * Matches TransportService and DriverLink card layouts.
 */

import { motion } from 'motion/react';

interface SkeletonCardProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Variant: 'service' for transport list, 'driver-link' for rapportino cards */
  variant?: 'service' | 'driver-link' | 'generic';
}

/* ── Shimmer pulse animation ────────────────────────────── */
const shimmer = {
  hidden: { opacity: 0.4 },
  visible: {
    opacity: 0.7,
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── Service card skeleton ──────────────────────────────── */
function ServiceCardSkeleton() {
  return (
    <motion.div
      variants={shimmer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-3"
    >
      {/* Header row: time + client */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-12 rounded bg-surface-container-high" />
        <div className="h-4 w-32 rounded bg-surface-container-high" />
      </div>
      {/* Pickup/dropoff addresses */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-surface-container-high" />
          <div className="h-3 w-48 rounded bg-surface-container-high" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-surface-container-high" />
          <div className="h-3 w-44 rounded bg-surface-container-high" />
        </div>
      </div>
      {/* Bottom row: amount + passengers */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-surface-container-high" />
        <div className="h-4 w-20 rounded bg-surface-container-high" />
      </div>
    </motion.div>
  );
}

/* ── DriverLink card skeleton (rapportino) ──────────────── */
function DriverLinkCardSkeleton() {
  return (
    <motion.div
      variants={shimmer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4"
    >
      {/* Header: avatar + driver name */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-surface-container-high" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-28 rounded bg-surface-container-high" />
          <div className="h-3 w-20 rounded bg-surface-container-high" />
        </div>
      </div>
      {/* Service card placeholder */}
      <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-10 rounded bg-surface-container-high" />
          <div className="h-4 w-24 rounded bg-surface-container-high" />
        </div>
        <div className="h-3 w-40 rounded bg-surface-container-high" />
        <div className="h-3 w-36 rounded bg-surface-container-high" />
      </div>
      {/* Maps buttons */}
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
        <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
      </div>
    </motion.div>
  );
}

/* ── Generic skeleton (list items, tables) ──────────────── */
function GenericSkeleton() {
  return (
    <motion.div
      variants={shimmer}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface p-3"
    >
      <div className="h-10 w-10 shrink-0 rounded bg-surface-container-high" />
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-4 w-3/4 rounded bg-surface-container-high" />
        <div className="h-3 w-1/2 rounded bg-surface-container-high" />
      </div>
      <div className="h-6 w-16 rounded bg-surface-container-high" />
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export function MobileSkeleton({ count = 3, variant = 'generic' }: SkeletonCardProps) {
  const Card = variant === 'service'
    ? ServiceCardSkeleton
    : variant === 'driver-link'
      ? DriverLinkCardSkeleton
      : GenericSkeleton;

  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Caricamento…">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
      <span className="sr-only">Caricamento…</span>
    </div>
  );
}

/* ── Row skeleton for table-like layouts ────────────────── */
export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1" role="status" aria-label="Caricamento…">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={shimmer}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2"
        >
          <div className="h-4 w-4 rounded bg-surface-container-high" />
          <div className="h-3 flex-1 rounded bg-surface-container-high" />
          <div className="h-3 w-20 rounded bg-surface-container-high" />
          <div className="h-3 w-16 rounded bg-surface-container-high" />
        </motion.div>
      ))}
      <span className="sr-only">Caricamento…</span>
    </div>
  );
}

export default MobileSkeleton;
