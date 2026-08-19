import React from 'react';

type SemanticColor = {
  text: string;
  bg: string;
  dot?: string;
};

const STATUS_COLORS: Record<string, SemanticColor> = {
  // Service operational
  Importado:   { text: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400' },
  Asignado:    { text: 'text-blue-600',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  Confirmado:  { text: 'text-indigo-600',  bg: 'bg-indigo-50',   dot: 'bg-indigo-500' },
  EnRuta:      { text: 'text-amber-600',   bg: 'bg-amber-50',    dot: 'bg-amber-500' },
  Realizado:   { text: 'text-orange-600',  bg: 'bg-orange-50',   dot: 'bg-orange-500' },
  Reportado:   { text: 'text-purple-600',  bg: 'bg-purple-50',   dot: 'bg-purple-500' },
  Revision:    { text: 'text-cyan-600',    bg: 'bg-cyan-50',     dot: 'bg-cyan-500' },
  Validado:    { text: 'text-emerald-600', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  Cancelado:   { text: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-500' },
  Deleted:     { text: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-500' },

  // Service financial
  Calculado:       { text: 'text-gray-600',    bg: 'bg-gray-100' },
  Confrontacion:   { text: 'text-amber-600',   bg: 'bg-amber-50' },
  Cerrado:         { text: 'text-orange-600',  bg: 'bg-orange-50' },
  CerradoComercial:{ text: 'text-green-600',   bg: 'bg-green-50' },
  Facturado:       { text: 'text-blue-600',    bg: 'bg-blue-50' },
  Cobrado:         { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  Anulado:         { text: 'text-red-600',     bg: 'bg-red-50' },
  Pendiente:       { text: 'text-gray-600',    bg: 'bg-gray-100' },

  // Rapportino (Client / Driver / Collaborator)
  Borrador:   { text: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400' },
  Revisado:   { text: 'text-blue-600',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  Enviado:    { text: 'text-purple-600',  bg: 'bg-purple-50',   dot: 'bg-purple-500' },
  Aceptado:   { text: 'text-amber-600',   bg: 'bg-amber-50',    dot: 'bg-amber-500' },
  Rechazado:  { text: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-500' },
  Pagado:     { text: 'text-emerald-600', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },

  // Driver
  Disponible: { text: 'text-emerald-600', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  Inactivo:   { text: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400' },

  // Project
  Nuovo:         { text: 'text-gray-600',    bg: 'bg-gray-100' },
  Preparazione:  { text: 'text-amber-600',   bg: 'bg-amber-50' },
  Attivo:        { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  Fatturazione:  { text: 'text-blue-600',    bg: 'bg-blue-50' },
  Incasso:       { text: 'text-green-600',   bg: 'bg-green-50' },
  Chiuso:        { text: 'text-emerald-600', bg: 'bg-emerald-50' },

  // Advance
  Descontado: { text: 'text-emerald-600', bg: 'bg-emerald-50' },

  // Import
  registered: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  parsed:     { text: 'text-amber-600',   bg: 'bg-amber-50' },

  // Generic fallbacks
  active:   { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  inactive: { text: 'text-gray-600',    bg: 'bg-gray-100' },
  success:  { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning:  { text: 'text-amber-600',   bg: 'bg-amber-50' },
  error:    { text: 'text-red-600',     bg: 'bg-red-50' },
  info:     { text: 'text-blue-600',    bg: 'bg-blue-50' },
};

const FALLBACK: SemanticColor = { text: 'text-gray-600', bg: 'bg-gray-100' };

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded',
  sm: 'text-[11px] px-2 py-0.5 rounded-full',
  md: 'text-[12px] px-2.5 py-1 rounded-full',
};

export default function StatusBadge({ status, size = 'sm', showDot = false, className = '' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || FALLBACK;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${colors.text} ${colors.bg} ${sizeClass} ${className}`}>
      {showDot && colors.dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export { STATUS_COLORS };
