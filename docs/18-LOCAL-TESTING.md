# 18 — Prueba local del sistema (pre-v1)

Guía para levantar el sistema en tu máquina y recorrer el circuito completo antes de cortar la v1.

---

## 0. Qué se prueba y contra qué backend

```
Navegador → Vite dev server (localhost:3001) → Apps Script Web App (deploy real) → Google Sheets (datos reales)
```

**Estado actual (verificado):** el Web App corre el deployment del `.env`, redesplegado con los cambios de `serviceEconomics`, `rateCard`, `reconciliation`, `driverReport`, `whatsapp`, **gestión de contraseñas**, **roles/permisos en el alta de usuarios**, **backup snapshot**, **purga de datos de prueba** y los fixes de dinero que destapó la batería E2E (versión **240**). No hace falta volver a desplegar para probar.

| Qué querés probar | Qué hacer primero |
|---|---|
| Todo el sistema | Nada más: `npm run dev` y listo |
| Solo cambios de backend posteriores a este documento | `npx clasp push` en `Transport Action Unified/` + **redesplegar** el mismo deployment ID |

`clasp push` solo actualiza el HEAD del proyecto: **no** cambia el código que sirve el Web App. Sin redespliegue, GAS sigue sirviendo la versión publicada anterior.

Para volver atrás después de un cambio riesgoso:

```powershell
clasp deploy --deploymentId <DEPLOYMENT_ID> --versionNumber 239 -d "rollback"
```

---

## 1. Requisitos

- **Node 22** (`node -v` → v22.x). Vitest 4 no corre en Node 20.
- Dependencias instaladas: `npm ci` dentro de `Transport Action All/`.
- Archivo `Transport Action All/.env` con la URL del Web App:

  ```bash
  VITE_GAS_WEBAPP_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
  ```

  (`.env` está en `.gitignore`; el ejemplo está en `.env.example`)
- Credenciales: usuario `admin` con **la contraseña que fijaste en el paso 6.1**.
  `utils/setupAdmin.gs` genera una contraseña aleatoria por instalación y la
  imprime una sola vez en el log de ejecución: no hay contraseña por defecto en
  el repositorio. En este entorno la temporal `admin123` **ya fue rotada**, así
  que si no la tenés anotada, pedile a otro admin un reset (paso 6.2) o volvé a
  correr `utils/setupAdmin.gs` desde el editor de Apps Script.

---

## 2. Arranque y verificaciones automáticas

```bash
cd "Transport Action All"
npm install        # o npm ci
npm run dev        # http://localhost:3001
```

| Comando | Qué valida | Resultado esperado (verificado) |
|---|---|---|
| `npm run lint` | TypeScript estricto | sin salida, exit 0 |
| `npm test` | **792** tests unitarios (33 archivos) | `792 passed`, ~62 s |
| `npx playwright test e2e/auth.spec.ts` | login real contra el backend | `5 passed`, ~31 s (requiere `TEST_PASSWORD`) |
| `npx playwright test` | + flujo de creación de servicio | **escribe datos reales** en la Sheet — usar con cuidado |

Chequeo de conectividad al backend, sin tocar datos:

```powershell
$url = (Get-Content .env | Where-Object { $_ -match '^VITE_GAS_WEBAPP_URL=' }) -replace '^VITE_GAS_WEBAPP_URL=',''
Invoke-RestMethod "$url`?action=healthCheck"
# {"success":true,"data":{"status":"ok","version":"1.0.0",...}}
```

`healthCheck` responde aunque el deployment esté viejo: para saber qué código corre, probá una acción nueva (por ejemplo `resetPassword` en el paso 6.2). Si devuelve `error: "Unknown action"`, el Web App no está redesplegado.

---

### 2.1 Batería de sistema completo (API, 9 suites)

`scripts/e2e/` recorre la app **como usuario real** contra el Web App desplegado: no usa mocks. Cubre 217 de las 242 acciones del router (90 %), incluidos el ciclo de vida del servicio, la economía (rate cards, breakdowns, ajustes), el link público del chofer y la facturación.

```bash
node scripts/e2e/run.mjs --check      # valida la batería contra api.gs, sin red ni credenciales
node scripts/e2e/run.mjs              # corre todo (requiere TEST_PASSWORD)
node scripts/e2e/run.mjs --suite 05 --verbose
node scripts/e2e/run.mjs --json reports/e2e.json --coverage
```

| Suite | Qué prueba |
|---|---|
| `01-system-auth` | login, sesión, permisos por rol, router (acción inexistente) |
| `02-catalog` | clientes, proyectos, choferes, vehículos, colaboradores, tarifas |
| `03-service-lifecycle` | crear → asignar → confirmar → iniciar → completar → validar, transiciones inválidas |
| `04-economics` | revenue/cost breakdown, ajustes, recálculo, invariantes |
| `05-driver-reports-links` | inbox (aceptar/rechazar/versionar) y link público del chofer + revocación |
| `06-rapportino` | rapportino por cliente, chofer y colaborador |
| `07-invoicing` | factura, items, cobro, gasto, anulación |
| `08-queries-audit` | listados, filtros, dashboard, auditoría y activity feed |
| `09-admin-settings` | usuarios, roles, settings, migraciones y snapshot |

`--check` es el paso previo barato: detecta un nombre de acción mal escrito en 20 ms, en vez de a mitad de una corrida larga por cold starts.

**Escribe datos reales.** Crea fixtures con el prefijo `E2E-<timestamp>` (cliente, proyecto, 3 choferes, vehículo, colaborador, tarifas) y las borra al final. `--keep` las deja para inspeccionarlas en la Sheet. No lo corras contra una base con producciones activas sin backup previo (§9).

---

## 3. Smoke test — bloque operativo (pasos 1–9)

> Versión interactiva con checkboxes, progreso guardado y los atajos alternativos:
> [checklist-prueba-manual.html](checklist-prueba-manual.html). Abrilo en el navegador
> (funciona offline, sin servidor) o imprimilo a PDF.
>
> Si quien prueba no es técnico, dale [checklist-prueba-facil.html](checklist-prueba-facil.html):
> el mismo recorrido explicado sin jerga, con "qué hacés / qué tenés que ver / si no pasa"
> en cada paso. Los pasos que requieren terminal o consola quedaron aparte, en un anexo.
> Los bloques 17 a 20 recorren la app **rol por rol** (admin, coordinador, contabilidad,
> chofer) y verifican tanto lo que cada uno puede hacer como lo que el sistema debe negarle.
> Para esos cuatro hace falta un usuario por rol: se crean en el bloque 12.

Usar **datos de prueba** con prefijo `TEST-` en notas/proyecto, así se pueden borrar después.
No usar producciones activas: el flujo mueve estados reales y congela breakdowns.

| # | Dónde | Acción | Estado esperado |
|---|---|---|---|
| 1 | `/` | Login `admin` con tu contraseña actual | entra al dashboard, sin pantalla en blanco |
| 2 | `/dashboard` | Esperar carga | métricas y listado sin errores en consola |
| 3 | `/new-service` | Crear servicio (proyecto, origen, destino, fecha, chofer) | `OperationalStatus = Importado` |
| 4 | `/service/<id>` | Asignar chofer + vehículo | `Asignado` |
| 5 | workspace → Operaciones | Confirmar | `Confirmado` |
| 6 | workspace → Operaciones | Iniciar | `EnRuta` |
| 7 | workspace → Operaciones | Completar | `Realizado` |
| 8 | workspace → Operaciones | Reportar | `Reportado` |
| 9 | workspace → Operaciones | Validar | `Validado` + breakdowns congelados (no editables) |

Si el paso 9 congela importes, **anotá los totales**: se usan para contrastar el rapportino del paso 15.

---

## 4. Link público del chofer (pasos 10–12)

Este es el único flujo que sale de la sesión de la app y depende de los permisos del deployment (*Anyone with the link*). Por eso se prueba aparte.

| # | Dónde | Acción | Estado esperado |
|---|---|---|---|
| 10 | `/driver-links` | Generar link para el servicio del paso 3 | URL `...?action=driverForm&token=...` |
| 11 | ventana incógnito | Abrir el link (sin sesión de admin) y cargar el parte | el formulario abre y el parte queda enviado |
| 12 | `/driver-reports` | Revisar y aprobar ese parte | desaparece del inbox y el servicio queda consistente |

Qué mirar con atención en el paso 11:

- Que la página **abra sin pedir login** (si redirige al login, el deployment quedó con acceso restringido).
- Que el token de otro servicio/proyecto sea **rechazado** con mensaje, no con pantalla en blanco.
- Que al enviar, el parte aparezca en `/driver-reports` sin recargar a mano.

---

## 5. Financiero y cierre (pasos 13–18)

| # | Dónde | Acción | Estado esperado |
|---|---|---|---|
| 13 | `/financial` | Calcular → Confrontar → Confirmar actuals → Aprobar → Facturable → Facturar → Cobrar | cada paso respeta la máquina de estados; un salto inválido debe **rechazarse** con error claro |
| 14 | `/reconciliation` | Crear reconciliación del período | sin crash, importes coherentes |
| 15 | `/rapportinos` | Generar/editar rapportino del servicio | totales cuadran con el parte aprobado y con el paso 9 |
| 16 | `/rate_cards` | Ver/editar tarifas, recalcular un servicio | el cálculo cambia y queda auditado |
| 17 | `/accounting`, `/customers`, `/providers`, `/drivers`, `/vehicles`, `/projects` | Navegar y abrir un detalle de cada uno | sin errores de carga |
| 18 | `/audit-center` | Buscar el servicio creado | aparecen los eventos de los pasos 3–15 en orden |

Cierre de sesión:

| # | Acción | Estado esperado |
|---|---|---|
| 19 | `F5` + re-login y volver al servicio | la sesión persiste y el estado sigue igual |
| 20 | `/settings` | guardar un cambio y recargar: persiste |

### 5.1 Sociedad emisora (issuer de facturas)

Sin una fila en la hoja `OperatingCompany` no se puede emitir ninguna factura.
En esta instalación ya existe:

| Campo | Valor |
|---|---|
| ID | `OC-TA-2026-00003` |
| Nombre | Agencia de Transporte |
| Dirección | Via San Fernando 7 |
| VAT | `00FALSO12135` |
| Moneda / IVA | EUR / 21 % |

> **El VAT es falso a propósito.** No valida formato en el backend, así que se
> acepta, pero una factura emitida con él **no es deducible para el cliente**.
> Antes de la primera factura real hay que reemplazarlo por el CIF verdadero
> desde `/settings` (Company Settings → editar Transport Action → guardar).

Antes de esto, `createOperatingCompany` existía en el backend pero no estaba
cableado en el frontend, y el guardado usaba el literal del slot (`'TA'`) como
si fuera el ID: fallaba con `NotFound` y el `catch` lo tragaba. Editabas VAT,
dirección y teléfono y no se guardaba nada, sin un solo error en pantalla.
Hoy el guardado resuelve el slot por nombre y **crea la sociedad si no existe**.

---

## 6. Usuarios y contraseñas

### 6.1 Rotar la contraseña por defecto

1. Entrar a `/user-management` como `admin`.
2. Botón **Change my password** (arriba, al lado de *Create User*).
3. Contraseña actual (la que usás hoy), nueva contraseña de al menos 6 caracteres, confirmar.
4. Guardar, cerrar sesión y volver a entrar con la contraseña nueva.

El cambio queda registrado en `/audit-center` como `user.passwordChanged`.

### 6.2 Resetear la contraseña de otro usuario

1. En `/user-management`, buscar el usuario en la tabla.
2. Clic en el ícono de **llave** (columna Actions) → se abre *Reset password*.
3. Escribir la nueva contraseña dos veces → **Reset password**.

Resultado esperado:

- No pide la contraseña vieja del usuario (es la vía de recuperación).
- Si el usuario tenía sesión abierta, **se le cierra**: tiene que volver a loguearse.
- Si te reseteás a vos mismo, tu sesión actual sigue viva.
- El evento `user.passwordReset` aparece en `/audit-center`.
- Validaciones que deben frenar el submit: menos de 6 caracteres, contraseñas distintas.

### 6.3 Aprobar un usuario pendiente (rol obligatorio)

1. Registrarse con una cuenta nueva (queda `pending`).
2. Como `admin`, en `/user-management` clic en ✓ **Approve**.
3. Se abre el modal **Approve user**: elegir el rol (Admin / Coordinator / Accounting / Driver) → **Approve as …**.
4. Esa cuenta ya puede entrar y ve en el menú solo las secciones de su rol.

Por qué el rol es obligatorio: el registro guarda el literal `pending` en la columna Role. Aprobar sin asignar rol dejaba una cuenta que **podía iniciar sesión pero no podía abrir ninguna pantalla** (el sidebar quedaba vacío y el dashboard respondía 403). Ahora el backend rechaza el login sin rol con *"Account has no role assigned. Ask an administrator to set your role."* y el alta pide el rol en el mismo paso.

Para corregir una cuenta ya aprobada sin rol (badge ámbar **no role**):

- Clic en el badge **no role** → asigna `driver` (mínimo privilegio), o
- Botón **Edit** (lápiz) → campo Role → **Save Changes**.

Efecto de cada rol en el menú:

| Rol | Ve |
|---|---|
| `admin` | todo |
| `coordinator` | operación, finanzas, gestión, sin Users/System sensibles |
| `accounting` | finanzas, clientes, documentos, auditoría |
| `driver` | solo *Driver Reports* y *Documents* |

> Un usuario con rol `driver` necesita además un perfil en la hoja *Drivers* con el **mismo email**, si no el backend responde `DRIVER_NOT_LINKED`. Hoy la hoja Drivers no tiene emails cargados, así que el flujo real del chofer es el **link público** (sección 4), no una cuenta.

### 6.4 Verificar el guard de permisos

1. Entrar con una cuenta que no sea admin (por ejemplo `coordinator`).
2. Escribir a mano `http://localhost:3001/user-management` en la barra de direcciones.
3. Esperado: pantalla **"No access to this section"** con botón *Go to my dashboard* y *Sign out*. No debe aparecer un error de React ni una tabla vacía.
4. Abrir `/` o una URL inexistente: debe redirigir a la primera pantalla permitida del rol, nunca al dashboard ejecutivo si el rol no lo tiene.

### 6.5 Dar de baja un usuario

1. En `/user-management`, botón **Delete** (papelera) sobre el usuario.
2. Esperado: el usuario **desaparece de la lista** y no puede volver a entrar
   (*"This account has been disabled"*), aunque la fila siga en la hoja como
   rastro de auditoría.
3. La baja de tu propia cuenta y la del **último admin activo** se rechazan.
4. El evento `user.deleted` aparece en `/audit-center`.

> Antes de v1 este comando reportaba `success` y no hacía nada: `_softDelete`
> escribía en una columna `ID` que la hoja Users no tiene (`User_ID`), así que
> la baja fallaba en silencio y el usuario seguía entrando.

---

### 6.6 Recuperar la contraseña de admin sin sesión

Todos los resets de arriba exigen estar logueado como admin. Si se perdió la única credencial, la vía es un script en el editor de Apps Script:

1. Abrir el proyecto en https://script.google.com → editor.
2. Elegir la función `resetAdminPassword` (archivo `utils/resetAdminPassword.gs`).
3. **Ejecutar** y autorizar.
4. Copiar del log la contraseña generada — se muestra **una sola vez**.
5. Entrar a la app y cambiarla desde **Change my password**.

Qué hace: salt nuevo + hash nuevo, revoca la sesión abierta de esa cuenta y no toca rol ni estado. Si la cuenta está `pending`, `disabled` o `deleted`, el log lo avisa y el login la sigue rechazando: primero hay que aprobarla.

---

## 7. Verificación en móvil

Probar en un teléfono real (o DevTools → modo dispositivo a **375 × 667**). Recorrer al menos: login, `/dashboard`, `/transport`, un servicio, `/driver-reports`, `/user-management`.

| Qué | Resultado esperado |
|---|---|
| Barra superior | franja fija de 48 px con el nombre del sistema; el menú ☰ no tapa títulos |
| Menú ☰ | abre el drawer completo con etiquetas (aunque el sidebar esté en modo íconos), fondo oscurecido, botón ✕ para cerrar, y bloquea el scroll de atrás |
| Navegación | tocar un ítem cierra el drawer y navega |
| Tablas | scroll horizontal dentro de la tarjeta; nunca se desborda la página |
| Modales | se abren como bottom sheet, con header/footer fijos y el cuerpo scrolleable; los botones Guardar/Cancelar siempre alcanzables |
| Inputs | al enfocar un campo **no** hay zoom automático en iOS (font-size ≥ 16 px) |
| Dashboard | la fila de filtros se parte en dos líneas; nada queda cortado a la derecha |
| Workspace del servicio | header compacto, tabs inferiores, panel lateral a pantalla completa |
| Safe area | en iPhone con notch, el contenido no queda debajo del home indicator |

Anotar dispositivo, navegador y pantalla de cualquier cosa que falle.

---

## 8. Pruebas negativas (deben fallar bien, no romper)

- Saltar `Confirmado → EnRuta` sin confirmar → error de transición, no excepción.
- Abrir un link de chofer vencido o de otro proyecto → rechazo con mensaje.
- Entrar a `/user-management` con un usuario que no sea `admin` → bloqueado.
- Resetear contraseña con menos de 6 caracteres o confirmación distinta → error en el modal, sin llamar al backend.
- Usar la contraseña vieja después de un reset → login rechazado.

---

## 9. Backup de la base

Antes de cada release, y siempre antes de una migración, sacá un snapshot de los
datos. No requiere `clasp` ni credenciales de Google: usa la API del Web App.

```powershell
$env:ADMIN_PASSWORD = '<tu contraseña de admin>'
node scripts/backup-snapshot.mjs
# opcional: --out D:\backups   --include Services,Users
```

Deja `backups/db-AAAAMMDD-HHMMSS.json` (ignorado por git) y imprime el conteo de
filas por hoja. Verificá que el total coincida con el de la pantalla de la Sheet:
si una hoja sale recortada, el script lo avisa con `AVISO: hojas recortadas`.

Qué cubre y qué no:

| Cubre | No cubre |
|---|---|
| Todas las filas de todas las hojas (39 en este entorno) | Fórmulas, formatos, validaciones, hojas ocultas |
| Timestamp, ID de la hoja y conteos | Restaurar contraseñas: `Users` sale con `Password_Hash`, `Salt` y `Token` en `[redacted]` |

El respaldo fiel sigue siendo **Archivo → Hacer una copia** en Google Sheets, o
`Archivo → Descargar → .xlsx`. El snapshot sirve para comparar y para recuperar
datos, no para reemplazar el archivo.

Endpoint: `action=exportSnapshot` (solo `admin`, permiso `system.backup`), con
`maxCells` e `includeSheets` opcionales. Queda auditado como
`system.backupExported` en `/audit-center`.

### 9.1 Limpiar los datos de la batería

La batería crea clientes, proyectos, servicios, facturas y links **reales**. Al
terminar intenta borrarlos con los comandos del dominio, pero esos comandos son
conservadores a propósito: un servicio en `Validado`, `Realizado` o `Facturado`
no se puede borrar, y un cliente con proyectos tampoco. Cuando una suite falla a
mitad de camino, esos restos quedan.

`purgeTestData` barre por **etiqueta**, no por comando, y en cascada por IDs.

```powershell
node scripts/e2e/purge.mjs --dry        # simulacro: qué borraría (tag E2E-)
node scripts/e2e/purge.mjs --confirm    # borra de verdad
node scripts/e2e/purge.mjs --tag E2E-20261125171628 --confirm
```

Reglas de seguridad del barrido:

| Regla | Detalle |
|---|---|
| Permiso | `system.backup`, solo `admin` (el mismo del snapshot) |
| Alcance | filas que **contengan** la etiqueta + filas que referencian por ID a una borrada |
| Usuarios | excluidos por defecto; `--include-users` los incluye, pero nunca a `admin` |
| Confirmación | sin `--confirm` es simulacro, aunque la etiqueta sea válida |
| Auditoría | deja `system.testDataPurged` con el conteo por hoja |

Antes y después del barrido conviene un snapshot (§9) para comparar filas.

---

## 10. Si algo falla

1. **F12 → Network**, filtrar por `exec`. Cada llamada lleva `?action=<nombre>` y un body JSON. Esa acción es la que hay que buscar en `Transport Action Unified/api.gs`.
2. **Cold start**: la primera llamada después de un rato puede tardar 3–10 s. El cliente reintenta con backoff; no es un bug.
3. **401 / 403**: token vencido (volver a loguear) o permiso faltante en la matriz de `docs/08-PERMISSIONS.md`.
4. **"Unknown action"**: el frontend está nuevo y el deployment viejo → `clasp push` + redesplegar.
5. **"Transición inválida"**: es correcto, lo lanza `_assertValidTransition`. Revisar `docs/04-STATE_MACHINES.md`.
6. **`success: true` con `data.error` dentro**: el sobre HTTP del router
   (`api.gs` → `{ success: true, data: result }`) es siempre `true` cuando la
   acción existió; el fallo de negocio viaja **dentro** de `data` (por ejemplo
   `data.error: "Invalid credentials"`). No mires `success` para saber si una
   operación salió bien: mirá `data`/`data.error`. Un script que solo valida
   `success` va a reportar éxito en un login rechazado.
7. **Pantalla en blanco**: `localStorage.clear()` y recargar; si persiste, mirar `ErrorBoundary` en consola.
8. **Importes con cola decimal** (`603.1849999999999`) o una factura que
   nunca pasa a `Pagada` pese a estar cobrada: es aritmética de punto flotante.
   Todo importe se redondea a céntimos con `_roundMoney()` / `_sumMoney()` /
   `_moneyExceeds()` ([utils/money.gs](../Transport%20Action%20Unified/utils/money.gs)).
   Si un importe nuevo aparece con cola, falta redondear en su punto de creación.

Para reportar un fallo sirve: pantalla, acción clickeada, `action` de la request, payload y la respuesta JSON.

---

## 11. Pendientes que esta guía NO cubre

- **ID de la Sheet en código.** `_constants.gs` tiene `DB_SHEET_ID` hardcodeado
  (es el valor de respaldo). No hay token de WhatsApp en el backend: la captura de
  WhatsApp es *pegar el texto* y parsearlo, no una API. Lo pendiente es mover ese
  ID a Script Properties para que el mismo código sirva a otra base de datos.
- **`utils/setupAdmin.gs` sigue en el proyecto.** Hoy genera una contraseña
  aleatoria por instalación (ya no hay default), pero una vez que el admin existe
  conviene borrarlo del proyecto de Apps Script para que nadie lo re-ejecute.
- **Un solo deployment vivo.** No hay staging: lo que se publica es producción.
  El rollback es una versión anterior del mismo deployment (sección 12).
- Deuda de UI conocida: `ServiceWorkspaceTabs.tsx` (2.846 líneas), 81 `any`, 14 `console.log`.

---

## 12. Release versionado (push + versión + deploy)

```powershell
.\scripts\release.ps1 -Message "v1: rate cards y reconciliación"
```

El script hace, en orden, y **se detiene en el primer fallo**:

| Paso | Qué hace | Si falla |
|---|---|---|
| 1 | `npm run lint` + `npm test` | no publica nada |
| 2 | `clasp push` | no publica nada |
| 3 | `clasp version "<mensaje>"` | no toca el deployment vivo |
| 4 | `clasp deploy -i <id> -V <nueva>` | el Web App sigue en la versión anterior |
| 5 | `healthCheck` contra el `/exec` real | imprime el rollback |

Detalles que importan:

- Usa **el mismo deployment ID** que la URL del `.env`: la URL no cambia y se
  conservan los permisos (los links públicos de chofer necesitan "Anyone").
- Cada release deja una **versión inmutable**. Para volver atrás, el script
  imprime la línea exacta con el número anterior.
- `-SkipTests` publica sin correr la suite. Solo para un hotfix urgente.
- Verificado: crea la versión, redespliega y el `healthCheck` responde `ok`.
- **Si PowerShell bloquea el script** ("no está firmado digitalmente"), corré:
  `pwsh -ExecutionPolicy Bypass -File .\scripts\release.ps1 -Message "..."`.

Lo que el script **no** hace (a propósito): no hace commit, no pushea a git y no
toca el frontend. El orden recomendado es commit → release → prueba.
