---
author: its-me-brian
branch: main
status: complete
updated: 2026-11-28
---
# Calendario legible: producción en gris y vistas sin recortes

## Intent
El usuario pidió que los transportes de producción dejen de estar invisibles en el calendario:
deben aparecer en gris, sin posibilidad de editarlos ni seleccionar nada de ellos, porque los
opera la propia producción y no son negocio de la empresa. Además pidió mejorar la visualización
y los efectos de cambio entre vistas para facilitar el uso.

## Scope
- Incluido: WeekView, MonthView, DayDetailView, DashboardHeader, DashboardScreen, useDashboard, types.
- Incluido: rejilla horaria dinámica derivada de los servicios del día, con límites 0–24.
- Incluido: lista por día en móvil, indicador de filtros activos, transiciones animadas.
- Excluido: backend / Apps Script. Sigue en v240, sin redeploy.
- Excluido: permisos de edición en ServiceWorkspace; este cambio cubre las tarjetas del calendario.

## Checklist
- [x] Los servicios de producción aparecen en las 3 vistas, en gris y sin handlers de edición.
- [x] No se pueden seleccionar en bulk ni abrir con doble clic.
- [x] La rejilla del día cubre la hora real del primer y último servicio, incluso 20:00–23:30.
- [x] Mes muestra totales, sin chofer y producción; móvil muestra lista por día.
- [x] Filtros activos se ven y se pueden limpiar con un botón, sin falso positivo al cargar.
- [x] Cambio de vista animado, desactivado si el sistema pide menos movimiento (pill incluido).
- [x] `tsc --noEmit` y `vitest run` en verde.
- [x] `rsc risk` + revisor en fresco (tier 1, 1 reviewer).

## Evidence
- `canEditService()` es la única fuente de verdad: producción (`Production Van/Car`) se filtra de
  selección, bulk, drag y apertura; se renderiza como tarjeta gris sin `onClick`/`onDoubleClick`.
- `useDashboard.ts`: `dayHourRange` crece con los horarios reales del día; `getTimeWindowEnd()`
  redondea 23:30 a 24:00 para que el bloque no se recorte; `layoutServices` usa la misma función.
- `useDashboard.ts`: `projectsInitialized` evita que el chip de filtros activos aparezca durante
  la carga inicial o al entrar a un proyecto sin filtros del usuario.
- `DashboardHeader.tsx`: `useReducedMotion()` desactiva también el resorte del pill de día/semana/mes.
- `DashboardScreen.tsx`: `AnimatePresence mode="wait"` + `motion.div` con fade/offset respeta
  `useReducedMotion()` (duración 0 cuando el sistema pide menos movimiento).
- `WeekView.tsx`: móvil pasa de siete columnas apiladas a un `<details>` por día.
- `MonthView.tsx`: totales del mes, sin chofer y producción; puntos grises para producción.
- `npx tsc --noEmit` → sin errores (2026-11-28).
- `npx vitest run` → 34 archivos, 820 tests passed (2026-11-28).
- `rsc risk` → tier 1, 1 reviewer. Revisor en contexto fresco: 3 should-fix, 0 blockers; los 3 se
  corrigieron y la suite quedó en verde.
- Verificación visual en navegador: no ejecutada (servidor local no disponible en la sesión).

## Next
Pasada visual humana en el navegador con los datos demo cargados; si aparece algún detalle de
layout, abrir un FTD nuevo en vez de reabrir este.
