import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, Navigation, ChevronRight } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface DriverInfo {
  name: string;
  avatar?: string;
}

interface ServiceCard {
  id: string;
  time: string;           // "07:30" or "7.1" (sequence)
  production: string;     // "WANDERING IN ROME PRODUCTIONS LLC"
  date: string;           // "19/08/2026"
  section?: string;       // "PUGLIA"
  passenger?: string;     // "Luca Zuccolo; Lorenzo Catenacci"
  origin: string;         // "AH Premium baia dei Faraglioni..."
  destination: string;    // "Mattinata Harbour"
  pickupMapsUrl?: string;
  dropoffMapsUrl?: string;
}

interface DriverLinkViewProps {
  driver: DriverInfo;
  services: ServiceCard[];
  dateRange: string;      // "01/08/2026 — 31/08/2026"
}

// ============================================================================
// Sub-components
// ============================================================================

function ServiceCardItem({
  service,
  index,
}: {
  service: ServiceCard;
  index: number;
}) {
  const hasMaps = !!(service.pickupMapsUrl || service.dropoffMapsUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.06 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-sm"
    >
      {/* Header: time + production + date */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Time badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[15px] font-semibold tabular-nums">
              {service.time}
            </span>
          </div>
          {/* Production */}
          <span className="text-[13px] font-semibold text-on-surface truncate">
            {service.production}
          </span>
        </div>
        {/* Date */}
        <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md whitespace-nowrap shrink-0">
          {service.date}
        </span>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1.5 text-[12px] text-on-surface-variant mb-3">
        {service.section && (
          <div>
            <span className="font-semibold text-on-surface">Sezione:</span>{' '}
            {service.section}
          </div>
        )}
        {service.passenger && (
          <div className="truncate">
            <span className="font-semibold text-on-surface">Passeggero:</span>{' '}
            {service.passenger}
          </div>
        )}
      </div>

      {/* Route: Origin → Destination */}
      <div className="flex flex-col gap-2">
        {/* Origin */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Navigation className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-0.5">
              Da
            </p>
            <p className="text-[13px] text-on-surface leading-snug">
              {service.origin}
            </p>
          </div>
        </div>

        {/* Connector line */}
        <div className="ml-[9px] w-px h-2 bg-outline-variant" />

        {/* Destination */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide mb-0.5">
              A
            </p>
            <p className="text-[13px] text-on-surface leading-snug">
              {service.destination}
            </p>
          </div>
        </div>
      </div>

      {/* Maps button — large, touch-friendly */}
      {hasMaps && (
        <div className="mt-4 flex flex-col gap-2">
          {service.pickupMapsUrl && (
            <a
              href={service.pickupMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 w-full px-4 py-3 bg-primary text-white rounded-xl text-[13px] font-semibold min-h-[44px] active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Apri origine in Maps
              </span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </a>
          )}
          {service.dropoffMapsUrl && (
            <a
              href={service.dropoffMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-on-surface rounded-xl text-[13px] font-semibold min-h-[44px] active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Apri destinazione in Maps
              </span>
              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DriverLinkView — Formulario mobile-first para conductores.
 *
 * Diseñado para abrirse en el celular del conductor.
 * Muestra su nombre/avatar, rango de fechas, y tarjetas de servicios
 * con botones grandes de Maps para打开 origen/destino.
 *
 * UX: Bottom-sheet feel, tipografía destacada para horarios,
 *     botones de Maps de 44px mínimo para facilitar el tap con pulgar.
 */
export default function DriverLinkView({
  driver,
  services,
  dateRange,
}: DriverLinkViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-primary text-white px-5 pt-8 pb-6 text-center"
      >
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center overflow-hidden ring-2 ring-white/30">
          {driver.avatar ? (
            <img
              src={driver.avatar}
              alt={driver.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white/80">
              {driver.name.charAt(0)}
            </span>
          )}
        </div>
        {/* Name */}
        <h1 className="text-[20px] font-bold tracking-tight mb-1">
          {driver.name}
        </h1>
        {/* Date range */}
        <p className="text-[12px] text-white/60 font-medium">{dateRange}</p>
      </motion.div>

      {/* Content */}
      <div className="px-4 py-5 space-y-3 max-w-lg mx-auto pb-[env(safe-area-inset-bottom,16px)]">
        {/* Section label */}
        <p className="font-label-caps text-on-surface-variant mb-2">
          Servizi del giorno
        </p>

        {/* Service cards — staggered animation */}
        {services.map((svc, i) => (
          <ServiceCardItem key={svc.id} service={svc} index={i} />
        ))}

        {/* Empty state */}
        {services.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <MapPin className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="text-[14px] text-on-surface-variant">
              Nessun servizio trovato
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Mock data for testing
// ============================================================================

export const MOCK_DRIVER: DriverInfo = {
  name: 'Giuseppe P.',
  avatar: undefined,
};

export const MOCK_SERVICES: ServiceCard[] = [
  {
    id: '1',
    time: '07:10',
    production: 'WANDERING IN ROME PRODUCTIONS LLC',
    date: '19/08/2026',
    section: 'PUGLIA',
    passenger: 'Luca Zuccolo; Lorenzo Catenacci (Dit Underwater; Focus Puller Underwater)',
    origin: 'AH Premium baia dei Faraglioni, Litoranea Mattinata, Strada Prov. Mattinata-Vieste km16, Mattinata FG',
    destination: 'Mattinata Harbour',
    pickupMapsUrl: 'https://maps.app.goo.gl/NHD6NDCUZ5WmL49N9',
    dropoffMapsUrl: 'https://maps.app.goo.gl/NHD6NDCUZ5WmL49N9',
  },
  {
    id: '2',
    time: '10:00',
    production: 'WANDERING IN ROME PRODUCTIONS LLC',
    date: '19/08/2026',
    section: 'PUGLIA',
    passenger: 'J.C. (Cast#5 Allie)',
    origin: 'Baia delle Zagare, Mattinata FG',
    destination: 'BASE CAMP - Cimitero di Mattinata',
    pickupMapsUrl: 'https://maps.app.goo.gl/mkFKzSSXTCjiMoiZ6',
  },
  {
    id: '3',
    time: '09:45',
    production: 'WANDERING IN ROME PRODUCTIONS LLC',
    date: '19/08/2026',
    section: 'PUGLIA',
    passenger: 'Mara Alcaly; Alessandra Agostini; Kelly Helstrom (UPM; Asst.; Media Res)',
    origin: 'Hotel Residence il Porto, Via del Mare, Mattinata FG',
    destination: 'SET - Baia dei Faraglioni Beach, Litoranea Mattinata, Strada Prov. Mattinata-Vieste km16, Mattinata FG',
  },
];
