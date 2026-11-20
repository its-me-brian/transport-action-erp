# 18 — Prueba local del sistema (pre-v1)

Guía para levantar el sistema en tu máquina y recorrer el circuito completo antes de cortar la v1.

---

## 0. Qué se prueba y contra qué backend

```
Navegador → Vite dev server (localhost:3001) → Apps Script Web App (deploy real) → Google Sheets (datos reales)
```

⚠️ **Leer antes de empezar.** Los cambios del backend que están sin commitear (`serviceEconomics.gs`, `rateCard.gs`, `reconciliation.gs`, `driverReport.gs`, `whatsapp.gs`, `repository.gs`) **no están deployados**. El Web App hoy corre la última versión publicada (responde `version: 1.0.0`).

| Qué querés probar | Qué hacer primero |
|---|---|
| Solo frontend (navegación, pantallas, formularios) | Nada más: `npm run dev` y listo |
| Frontend + cambios nuevos de backend | `npx clasp push` en `Transport Action Unified/` + **redesplegar** el Web App + actualizar `VITE_GAS_WEBAPP_URL` |

Sin redespliegue, GAS sigue sirviendo el código viejo aunque hagas `clasp push`.

---

## 1. Requisitos

- **Node 22** (`node -v` → v22.x). Vitest 4 no corre en Node 20.
- Dependencias instaladas: `npm ci` dentro de `Transport Action All/`.
- Archivo `Transport Action All/.env` con la URL del Web App:

  ```bash
  VITE_GAS_WEBAPP_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
  ```

  (`.env` está en `.gitignore`; el ejemplo está en `.env.example`)
- Credenciales de prueba: `admin` / `admin123` — creadas por `utils/setupAdmin.gs`.
  **Cambiar esta contraseña antes de abrir el sistema a usuarios reales.**

---

## 2. Arranque y verificaciones automáticas

```bash
cd "Transport Action All"
npm run dev        # http://localhost:3001
```

| Comando | Qué valida | Resultado esperado (verificado) |
|---|---|---|
| `npm run lint` | TypeScript estricto | sin salida, exit 0 |
| `npm test` | 774 tests unitarios (31 archivos) | `774 passed`, ~75 s |
| `npx playwright test e2e/auth.spec.ts` | login real contra el backend | `5 passed`, ~31 s |
| `npx playwright test` | + flujo de creación de servicio | **escribe datos reales** en la Sheet — usar con cuidado |

Chequeo de conectividad al backend, sin tocar datos:

```powershell
$url = (Get-Content .env | Where-Object { $_ -match '^VITE_GAS_WEBAPP_URL=' }) -replace '^VITE_GAS_WEBAPP_URL=',''
Invoke-RestMethod "$url`?action=healthCheck"
# {"success":true,"data":{"status":"ok","version":"1.0.0",...}}
```

---

## 3. Smoke test manual — circuito completo

Usar **datos de prueba** con prefijo `TEST-` en notas/proyecto, así se pueden borrar después.
No usar producciones activas: el flujo mueve estados reales y congela breakdowns.

| # | Dónde | Acción | Estado esperado |
|---|---|---|---|
| 1 | `/` | Login `admin` / `admin123` | entra al dashboard, sin pantalla en blanco |
| 2 | `/dashboard` | Esperar carga | métricas y listado sin errores en consola |
| 3 | `/new-service` | Crear servicio (proyecto, origen, destino, fecha, chofer) | `OperationalStatus = Importado` |
| 4 | `/service/<id>` | Asignar chofer + vehículo | `Asignado` |
| 5 | workspace → Operaciones | Confirmar | `Confirmado` |
| 6 | workspace → Operaciones | Iniciar | `EnRuta` |
| 7 | workspace → Operaciones | Completar | `Realizado` |
| 8 | workspace → Operaciones | Reportar | `Reportado` |
| 9 | workspace → Operaciones | Validar | `Validado` + breakdowns congelados (no editables) |
| 10 | `/driver-links` | Generar link del chofer para ese servicio | link `...?action=driverForm&token=...` |
| 11 | ventana incógnito | Abrir el link y cargar el parte | el parte aparece en el inbox |
| 12 | `/driver-reports` | Revisar y aprobar el parte | desaparece del inbox, servicio consistente |
| 13 | `/financial` | Calcular → Confrontar → Confirmar actuals → Aprobar → Facturable → Facturar → Cobrar | cada paso respeta la máquina de estados; un salto inválido debe **rechazarse** con error claro |
| 14 | `/rapportinos` | Generar/editar rapportino del servicio | totales cuadran con el parte aprobado |
| 15 | `/reconciliation` | Crear reconciliación del período | sin crash, importes coherentes |
| 16 | `/rate_cards` | Ver/editar tarifas, recalcular un servicio | el cálculo cambia y queda auditado |
| 17 | `/accounting`, `/customers`, `/providers`, `/drivers`, `/vehicles`, `/projects` | Navegar y abrir un detalle de cada uno | sin errores de carga |
| 18 | `/audit-center` | Buscar el servicio creado | aparecen los eventos de los pasos 3–13 en orden |
| 19 | — | `F5` + re-login y volver al servicio | la sesión persiste y el estado sigue igual |
| 20 | `/settings` | Guardar un cambio y recargar | el cambio persiste |

Pruebas negativas que también importan (deben fallar bien, no romper):

- Saltar `Confirmado → EnRuta` sin confirmar → error de transición, no excepción.
- Abrir un link de chofer vencido o de otro proyecto → rechazo con mensaje.
- Entrar a `/user-management` con un usuario que no sea `admin` → bloqueado.

---

## 4. Si algo falla

1. **F12 → Network**, filtrar por `exec`. Cada llamada lleva `?action=<nombre>` y un body JSON. Esa acción es la que hay que buscar en `Transport Action Unified/api.gs`.
2. **Cold start**: la primera llamada después de un rato puede tardar 3–10 s. El cliente reintenta con backoff; no es un bug.
3. **401 / 403**: token vencido (volver a loguear) o permiso faltante en la matriz de `docs/08-PERMISSIONS.md`.
4. **"Transición inválida"**: es correcto, lo lanza `_assertValidTransition`. Revisar `docs/04-STATE_MACHINES.md`.
5. **Pantalla en blanco**: `localStorage.clear()` y recargar; si persiste, mirar `ErrorBoundary` en consola.

Para reportar un fallo sirve: pantalla, acción clickeada, `action` de la request, payload y la respuesta JSON.

---

## 5. Pendientes que esta guía NO cubre

- Cambiar `admin123` y los secretos (token de WhatsApp, IDs de Sheet) a Properties.
- Deploy versionado (`clasp deploy`) para poder volver atrás.
- Los cambios del backend sin commitear: sin deploy, no se prueban en local.
