import React from 'react';
import { motion } from 'motion/react';
import { FileText, Eye, Send, CheckCircle, Calendar, Loader2, Link } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { RapportinoClientDTO, RapportinoDriverDTO, RapportinoCollaboratorDTO } from '../services/api';
import { PERIOD_TYPE_LABELS } from './RapportinoStatusFlow';

// ─── Status Configs ──────────────────────────────────────────────────────────

export type ClientStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Facturado';
export type DriverStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Pagado';
export type CollaboratorStatus = 'Borrador' | 'Enviado' | 'Aceptado' | 'Pagado';

export const CLIENT_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Revisado: { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Facturado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

export const DRIVER_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Revisado: { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Pagado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

export const COLLABORATOR_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Pagado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

export const CLIENT_TRANSITIONS: Record<ClientStatus, ClientStatus | null> = {
  Borrador: 'Revisado', Revisado: 'Enviado', Enviado: 'Aceptado', Aceptado: 'Facturado', Facturado: null
};

export const DRIVER_TRANSITIONS: Record<DriverStatus, DriverStatus | null> = {
  Borrador: 'Revisado', Revisado: 'Enviado', Enviado: 'Aceptado', Aceptado: 'Pagado', Pagado: null
};

export const COLLABORATOR_TRANSITIONS: Record<CollaboratorStatus, CollaboratorStatus | null> = {
  Borrador: 'Enviado', Enviado: 'Aceptado', Aceptado: 'Pagado', Pagado: null
};

export const CLIENT_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Revisar', Revisado: 'Enviar', Enviado: 'Aceptar', Aceptado: 'Facturar'
};

export const DRIVER_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Revisar', Revisado: 'Enviar', Enviado: 'Aceptar', Aceptado: 'Pagar'
};

export const COLLABORATOR_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Enviar', Enviado: 'Aceptar', Aceptado: 'Pagar'
};

// ─── Card Components ─────────────────────────────────────────────────────────

interface ClientCardProps {
  rapportino: RapportinoClientDTO;
  isUpdating: boolean;
  nextAction: 'review' | 'send' | 'accept' | 'facturar' | null;
  nextLabel: string | null;
  onStatusUpdate: (id: string, action: 'review' | 'send' | 'accept' | 'facturar') => void;
  onView: (r: RapportinoClientDTO) => void;
  formatDate: (d: string) => string;
}

export const ClientRapportinoCard = React.memo(function ClientRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, onStatusUpdate, onView, formatDate
}: ClientCardProps) {
  const sc = CLIENT_STATUS_CONFIG[r.status] || CLIENT_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.clientId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart || r.weekStart)} → {formatDate(r.periodEnd || r.weekEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.acceptedAt && <span className="text-on-surface-variant">Aceptado: {formatDate(r.acceptedAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});

interface DriverCardProps {
  rapportino: RapportinoDriverDTO;
  isUpdating: boolean;
  nextAction: 'review' | 'send' | 'accept' | 'pay' | null;
  nextLabel: string | null;
  linkLoading: boolean;
  onStatusUpdate: (id: string, action: 'review' | 'send' | 'accept' | 'pay') => void;
  onGenerateLink: (r: RapportinoDriverDTO) => void;
  onView: (r: RapportinoDriverDTO) => void;
  formatDate: (d: string) => string;
}

export const DriverRapportinoCard = React.memo(function DriverRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, linkLoading, onStatusUpdate, onGenerateLink, onView, formatDate
}: DriverCardProps) {
  const sc = DRIVER_STATUS_CONFIG[r.status] || DRIVER_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.driverId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart || r.weekStart)} → {formatDate(r.periodEnd || r.weekEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.paidAt && <span className="text-on-surface-variant">Pagado: {formatDate(r.paidAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onGenerateLink(r)}
          disabled={linkLoading}
          title="Generar link para conductor"
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer disabled:opacity-50"
        >
          <Link className="w-3.5 h-3.5" />
        </motion.button>
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});

interface CollaboratorCardProps {
  rapportino: RapportinoCollaboratorDTO;
  isUpdating: boolean;
  nextAction: 'send' | 'accept' | 'pay' | null;
  nextLabel: string | null;
  onStatusUpdate: (id: string, action: 'send' | 'accept' | 'pay') => void;
  onView: (r: RapportinoCollaboratorDTO) => void;
  formatDate: (d: string) => string;
}

export const CollaboratorRapportinoCard = React.memo(function CollaboratorRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, onStatusUpdate, onView, formatDate
}: CollaboratorCardProps) {
  const sc = COLLABORATOR_STATUS_CONFIG[r.status] || COLLABORATOR_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.collaboratorId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.paidAt && <span className="text-on-surface-variant">Pagado: {formatDate(r.paidAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});
