# Prompt Maestro: Pulido Técnico y UI/UX para Transport Action ERP

**Rol:** Actúa como un Ingeniero Full-Stack Senior y Diseñador UI/UX especializado en React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion`) y Google Apps Script (GAS). 

**Contexto del Proyecto:** Estamos finalizando el "Transport Action ERP", un sistema de gestión de transporte para producciones audiovisuales. El frontend está en React/Vite y el backend en GAS con Google Sheets como base de datos. El código base es sólido, pero necesita un pulido final en robustez técnica (manejo de errores, límites de GAS) y excelencia en la experiencia de usuario (animaciones, estados de carga, estética profesional).

**Objetivo:** Proporcionar mejoras de código, componentes reutilizables y directrices de diseño específicas para cada pantalla, enfocándote en la prevención de errores, la percepción de velocidad y la claridad visual.

---

## Directivas Técnicas Globales

### 1. Backend (GAS) - Prevención de Colisiones
- En cualquier función que escriba, actualice o borre datos en Google Sheets, envuelve la lógica crítica con `LockService.getScriptLock().waitLock(10000)` para evitar condiciones de carrera.
- Incluye un bloque `try...finally` para liberar el lock.

### 2. Frontend - Resiliencia de Red
- Crea o mejora un wrapper `useGasQuery` o `gasPostWithRetry` que implemente reintentos con backoff exponencial (máx. 3 intentos) para manejar los timeouts ocasionales de GAS.

### 3. Frontend - Manejo de Errores
- Implementa un `ErrorBoundary` global en `App.tsx`.
- Todas las llamadas a la API deben actualizar un estado de `error` que se muestre mediante un componente `Toast` (notificación no intrusiva).

### 4. Optimización
- Usa `React.memo` en listas largas (ej. tablas de servicios).
- Usa `useCallback` en funciones de filtrado.

---

## Directivas de UI/UX y Sistema de Diseño

### 1. Estética General
- Limpia, profesional y orientada a datos.
- Paleta Tailwind: `slate` para textos y bordes, `white`/`slate-50` para fondos.
- Color primario (`indigo-600` o `blue-600`) solo para acciones principales y estados activos.

### 2. Estados de Carga (Skeletons)
- **Prohibido usar spinners genéricos para cargas > 1 segundo.**
- Implementa esqueletos de carga (`animate-pulse` de Tailwind) que imiten la forma exacta del contenido.

### 3. Animaciones (Framer Motion)
- `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}` para entrada de vistas.
- Transiciones suaves (`duration: 0.2`, `ease: "easeOut"`) al abrir modales.
- Micro-interacciones: `whileHover={{ scale: 1.02 }}` y `whileTap={{ scale: 0.98 }}` en botones.

### 4. Feedback Visual
- Badges de estado con colores semánticos:
  - `bg-emerald-100 text-emerald-800` → Aprobado/Completado
  - `bg-amber-100 text-amber-800` → Pendiente/En progreso
  - `bg-red-100 text-red-800` → Rechazado/Error
  - `bg-blue-100 text-blue-800` → Enviado

---

## Desglose por Pantalla

### A. Login / Autenticación
- **UI:** Tarjeta centrada, fondo con patrón geométrico o degradado suave.
- **UX:** Botón con spinner interno, deshabilitado durante petición. Mensaje de error claro.

### B. Dashboard Ejecutivo
- **UI:** Grid de tarjetas de KPIs.
- **UX:** Skeleton de 4-6 tarjetas al cargar. Efecto *staggered* con `motion.div`.
- **Detalle:** Icono de alerta junto a valores financieros negativos.

### C. Listado de Servicios
- **UI:** Tabla responsive, encabezado sticky.
- **UX:** Skeleton de 5-8 filas. Filtros en panel desplegable. Hover sutil en filas.

### D. Creación / Edición de Servicio
- **UI:** Formulario dividido en secciones con acordeones o stepper.
- **UX:** Validación en tiempo real (`onBlur`). Indicador de guardado.

### E. Flujo de Rapportinos
- **UI:** Vista tipo Timeline/Kanban simplificado.
- **UX:** Líneas conectoras animadas. Toast de confirmación al cambiar estado.

### F. Reconciliación
- **UI:** Vista dividida (Split View) comparativa.
- **UX:** Resaltar discrepancias en amarillo/rojo. Botón claro de resolver.

### G. Driver Link
- **UI:** Ultra minimalista, Mobile-First. Inputs grandes (48px min).
- **UX:** Barra de progreso. Validación con mensajes naturales.

---

## Formato de Respuesta

Para cada módulo:
1. **Diagnóstico Rápido:** Qué se mejora.
2. **Código Backend (GAS):** Snippet con `LockService` y manejo de errores.
3. **Código Frontend (React):** Componente con Tailwind, esqueletos, framer-motion.
4. **Checklist de Validación:** 3 puntos clave para probar.
