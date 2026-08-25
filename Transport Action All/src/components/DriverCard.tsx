import React from 'react';
import { MessageSquare, MapPin, Truck, Clock, Pencil, Trash2 } from 'lucide-react';
import { Driver, getDriverAvatar } from '../types';
import { DriverRecord } from '../services/api';

interface DriverCardProps {
  driver: Driver;
  dbRec: DriverRecord | undefined;
  onEdit: (driver: Driver, dbRec: DriverRecord | undefined) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (phone: string) => void;
}

export default function DriverCard({ driver: dr, dbRec, onEdit, onDelete, onWhatsApp }: DriverCardProps) {
  const isAvailable = dr.status === 'Disponible';
  const isInTransit = dr.status === 'Asignado';
  const isOffDuty = dr.status === 'Inactivo';

  const openEdit = () => onEdit(dr, dbRec);
  const openWhatsApp = () => {
    const phone = (dbRec?.whatsapp || dbRec?.phone || '').replace(/[^0-9+]/g, '');
    if (phone) window.open(`https://wa.me/${phone.replace(/^\+/, '')}`, '_blank');
  };

  return (
    <div
      id={`driver-card-${dr.id}`}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col gap-2 hover:bg-surface-dim/30 transition-colors group relative"
    >
      {/* Header: avatar + name + status */}
      <div className="flex justify-between items-start">
        <div className="flex gap-2.5 items-center min-w-0">
          <div className={`w-10 h-10 rounded-full overflow-hidden bg-surface-container shrink-0 ${
            isAvailable ? 'ring-2 ring-primary/30' : isInTransit ? 'ring-2 ring-amber-400/30' : ''
          }`}>
            <img className="w-full h-full object-cover" src={getDriverAvatar(dr.name)} alt={dr.name} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-on-surface truncate">{dr.name}</h3>
            <p className="text-[11px] text-on-surface-variant">{dr.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium gap-1 ${
            isAvailable
              ? 'bg-emerald-100 text-emerald-700'
              : isInTransit
              ? 'bg-amber-100 text-amber-700'
              : 'bg-surface-container text-on-surface-variant'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? 'bg-emerald-500 animate-ping' : isInTransit ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`}></span>
            {dr.status}
          </span>
          <button
            onClick={openEdit}
            className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Edit driver"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="flex-1 py-1">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">Vehicle</span>
            <span className="font-medium text-on-surface">{dr.vehicle || '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</span>
            <span className="font-medium text-on-surface truncate">{dbRec?.phone || '—'}</span>
          </div>
        </div>

        <div className="h-px w-full bg-outline-variant/30 my-2"></div>

        {dbRec?.notes && (
          <p className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{dbRec.notes}</span>
          </p>
        )}
        {!dbRec?.notes && isAvailable && dr.currentLocation && (
          <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span>{dr.currentLocation}</span>
          </p>
        )}

        {isInTransit && dr.progress !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-500" /> Transit
              </span>
              <span>{dr.progress}%</span>
            </div>
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${dr.progress}%` }}></div>
            </div>
          </div>
        )}

        {isOffDuty && dr.restMandated && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" /> Rest mandated
          </p>
        )}

        {dbRec && (
          <div className="flex gap-3 mt-1 text-[10px] text-on-surface-variant">
            <span>Rides: {dbRec.totalRides || 0}</span>
            {dbRec.source && <span>Source: {dbRec.source}</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-2 border-t border-outline-variant/30">
        <button
          onClick={openEdit}
          className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={openWhatsApp}
          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded transition-colors cursor-pointer"
          title="Send WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(dr.id)}
          className="p-1.5 bg-surface-container hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
          title="Delete driver"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
