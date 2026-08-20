import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Footer actions — renders fixed at bottom */
  footer?: React.ReactNode;
  /** Max width on desktop (default: max-w-lg) */
  maxWidth?: string;
  /** Render body content */
  children: React.ReactNode;
}

/**
 * ResponsiveModal — Reemplaza todos los modales inline del proyecto.
 *
 * Desktop: centrado vertical + horizontal, max-w-lg, rounded-2xl.
 * Mobile (< sm): bottom-sheet slide-up, full-width, rounded-t-2xl.
 * Header fijo arriba, footer fijo abajo, contenido scrollable en el medio.
 *
 * UX: Bottom-sheet en móvil es el patrón nativo que los usuarios esperan.
 *     Header/Footer fijos evitan que los botones se pierdan al hacer scroll.
 */
export default function ResponsiveModal({
  open,
  onClose,
  title,
  footer,
  maxWidth = 'max-w-lg',
  children,
}: ResponsiveModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative z-10 bg-surface-container-lowest border border-outline-variant shadow-xl
              w-full ${maxWidth}
              flex flex-col
              /* Mobile: bottom-sheet */
              mx-0 sm:mx-4
              max-h-[92vh] sm:max-h-[85vh]
              rounded-t-2xl sm:rounded-2xl
              /* iPhone safe area */
              mb-0 sm:mb-0`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header — fixed */}
            {title && (
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
                <h2 className="text-[16px] sm:text-[18px] font-semibold text-on-surface truncate pr-2">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-surface-dim min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
            )}

            {/* Body — scrollable */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
              {children}
            </div>

            {/* Footer — fixed */}
            {footer && (
              <div className="shrink-0 border-t border-outline-variant px-4 sm:px-6 py-3 sm:py-4 bg-surface-container-lowest rounded-b-2xl sm:rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/*
 * Ejemplo de uso:
 *
 * const [open, setOpen] = useState(false);
 *
 * <ResponsiveModal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="Editar Conductor"
 *   footer={
 *     <div className="flex gap-3 justify-end">
 *       <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-outline-variant">
 *         Cancelar
 *       </button>
 *       <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-primary text-white">
 *         Guardar
 *       </button>
 *     </div>
 *   }
 * >
 *   <p>Contenido del modal...</p>
 * </ResponsiveModal>
 */
