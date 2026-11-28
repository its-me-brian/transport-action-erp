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
- Incluido: WeekView, MonthView, DayDetailView, DashboardHeader, DashboardScreen, ServiceCard, useDashboard, getHourSlots.
- Incluido: rejilla horaria dinámica (servicios fuera de 06:00–22:00 dejan de recortarse).
- Incluido: lista por día en móvil, indicador de filtros activos, transiciones animadas.
- Incluido: tarjetas accesibles por teclado y anunciadas como solo lectura por lectores de pantalla.
- Excluido: backend / Apps Script. Sigue en v240, sin redeploy.
- Excluido: permisos de edición en ServiceWorkspace; este cambio cubre las tarjetas del calendario.

## Checklist
- [x] Los servicios de producción aparecen en las 3 vistas, en gris y sin handlers de edición.
- [x] No se pueden seleccionar en bulk ni abrir con doble clic.
- [x] La rejilla del día cubre la hora real del primer y último servicio.
- [x] Mes muestra totales, sin chofer y producción; móvil muestra lista por día.
- [x] Filtros activos se ven y se pueden limpiar con un botón.
- [x] Cambio de vista animado, desactivado si el sistema pide menos movimiento.
- [x] `tsc --noEmit` y `vitest run` en verde.
- [x] `rsc risk` + revisor si el tier lo pide.

## Evidence
- ** Producción en gris**: revisado en `ServiceCard.tsx` (variantes compact y day) y `DayDetailView.tsx`:
  `readOnly = !canEditService(service)` controla `cursor-not-allowed`, `opacity-60`, `grayscale`,
  borde/b fondo gris y la ausencia de `onClick` / `onDoubleClick` / `onTouchEnd`. El revisor de
  contexto fresco confirmó que no queda ningún handler alcanzable (`ServiceCard.tsx:67-69,83-84,110-112,124`;
  `DayDetailView.tsx:141-150`).
- ** Sin selección ni apertura**: guardas en `useDashboard.ts:168-180` (bulk toggle con toast),
  `:330`, `:335-338`, `:390-394` y `:579-585` (`openService`). Confirmado por el revisor.
- ** Rejilla horaria**: `getHourSlots` y `dayHourRange` calculan el rango desde el primer y último
  servicio; los casos de formatos con punto/coma y minutos de un dígito están cubiertos en
  `types-all.test.ts:416-421` y pasan.
- ** Mes y móvil**: verificado por lectura de `MonthView.tsx` (totales, sin chofer, producción) y
  `WeekView.tsx` (lista por día en `grid-cols-1`), y ejecutado en navegador con Playwright:
  `week`, `month` y `day` renderizan sin errores de consola. Mes muestra `5 servicio(s) este mes`
  y `⚠ 3 sin chofer`; el día muestra la rejilla horaria completa. Screenshots en
  `reports/calendar-{week,month,day}.png` (ignorados por git).
- ** Filtros**: `hasActiveFilters` compara conjuntos (`useDashboard.ts:558-564`), no solo longitudes;
  `clearFilters` está en `:566-573`. `productionCount` pasó a contar sobre `filteredServices`, así el
  badge del header coincide con las tarjetas visibles.
- ** Animación**: `DashboardScreen.tsx:106-112` y `DashboardHeader.tsx:52,138-140` respetan
  `useReducedMotion`; `DayDetailView.tsx:122-125` corregido en este cierre para hacer lo mismo.
- ** Etiqueta del día**: `DashboardHeader.tsx:88` usa `baseDate.getDay()` en vez de reinterpretar
  una clave sin año con el año actual, y muestra el año. Antes navegar a otro año podía mostrar el
  día de la semana equivocado.
- ** Teclado y lector de pantalla**: las tarjetas editables son `role="button"`, `tabIndex=0` y
  responden a Enter/Espacio; las de producción son `role="group"`, `aria-disabled` y no enfocables.
  `ServiceCard.tsx` y `DayDetailView.tsx`.
- ** Checks**: `tsc --noEmit` → exit 0, sin salida. `vitest run` → exit 0, **34 archivos / 821 tests
  en verde**, 58.30 s. Servidor de desarrollo → HTTP 200 en `http://localhost:3001`.
- ** Riesgo y revisión**: `npx @ericrisco/rsc risk` → tier 1 (observado antes de este cierre), por lo
  que correspondía un revisor con contexto fresco. El revisor informó 7 hallazgos: 4 ya estaban
  resueltos en el árbol cuando leyó y 3 se aplicaron en este cierre (teclado/ARIA, contador de
  producción sobre filtrados, etiqueta del día con año).
- ** Pasada visual (ejecutada después del commit `b5aa4d6`)**: `npx playwright test e2e/calendar-visual.spec.ts`
  → **2/2 en verde**, 41,4 s. Caso 1: tres vistas sin crash, `aria-disabled=0` en el seed (no hay
  servicios de producción), 10 tarjetas enfocables con foco real, filtro aplicado → `Clear filters`
  visible → limpieza, y cambio `day↔month` con `prefers-reduced-motion`. Caso 2: un servicio de
  producción inyectado **sólo en el navegador** (sin escribir en la Sheet) quedó
  `role=group`, `aria-disabled=true`, sin `tabindex`, `cursor=not-allowed`, `opacity=0.6`,
  `filter=grayscale(1)`, fondo `rgb(243,244,246)`; un click forzado no navegó.
  Screenshot: `reports/calendar-production.png`.
- ** No ejecutado**: `rsc risk` no se volvió a correr después de los últimos 3 ajustes.

## Next
Commit `b5aa4d6` (`fix(calendar): keyboard access, production badge and day label`) pusheado y
verificado (`HEAD == origin/main`). Queda pendiente un segundo commit del usuario con la evidencia
de la pasada visual y el test `e2e/calendar-visual.spec.ts`. El frontmatter sigue en `in-progress`
a propósito: la skill FTD reserva `status: done` para el hook post-merge y acá no hubo merge.
