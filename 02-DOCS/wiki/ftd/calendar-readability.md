---
author: its-me-brian
branch: main
status: in-progress
---
# Calendario legible: producción en gris y vistas sin recortes

## Intent
El usuario pidió que los transportes de producción dejen de estar invisibles en el calendario:
deben aparecer en gris, sin posibilidad de editarlos ni seleccionarlo nada de ellos, porque los
opera la propia producción y no son negocio de la empresa. Además pidió mejorar la visualización
y los efectos de cambio entre vistas para facilitar el uso.

## Scope
- Incluido: WeekView, MonthView, DayDetailView, DashboardHeader, useDashboard, getHourSlots.
- Incluido: rejilla horaria dinámica ( servicios fuera de 06:00–22:00 dejan de recortarse ).
- Incluido: lista por día en móvil, indicador de filtros activos, transiciones animadas.
- Excluido: backend / Apps Script. Sigue en v240, sin redeploy.
- Excluido: permisos de edición en ServiceWorkspace; este cambio cubre las tarjetas del calendario.

## Checklist
- [ ] Los servicios de producción aparecen en las 3 vistas, en gris y sin handlers de edición.
- [ ] No se pueden seleccionar en bulk ni abrir con doble clic.
- [ ] La rejilla del día cubre la hora real del primer y último servicio.
- [ ] Mes muestra totales, sin chofer y producción; móvil muestra lista por día.
- [ ] Filtros activos se ven y se pueden limpiar con un botón.
- [ ] Cambio de vista animado, desactivado si el sistema pide menos movimiento.
- [ ] `tsc --noEmit` y `vitest run` en verde.
- [ ] `rsc risk` + revisor si el tier lo pide.

## Evidence
_(se llena con la salida observada de cada check)_

## Next
Ejecutar los checks y cerrar el documento con la evidencia real.
