# 18 — Prueba local del sistema (pre-v1)

Guía para levantar el sistema en tu máquina y recorrer el circuito completo antes de cortar la v1.

---

## 0. Qué se prueba y contra qué backend

```
Navegador → Vite dev server (localhost:3001) → Apps Script Web App (deploy real) → Google Sheets (datos reales)
```

**Estado actual (verificado):** el Web App corre el deployment del `.env`, ya redesplegado con los cambios de `serviceEconomics`, `rateCard`, `reconciliation`, `driverReport`, `whatsapp`, **gestión de contraseñas** y **roles/permisos en el alta de usuarios** (versión **225**). No hace falta volver a desplegar para probar.

| Qué querés probar | Qué hacer primero |
|---|---|
| Todo el sistema | Nada más: `npm run dev` y listo |
| Solo cambios de backend posteriores a este documento | `npx clasp push` en `Transport Action Unified/` + **redesplegar** el mismo deployment ID |

`clasp push` solo actualiza el HEAD del proyecto: **no** cambia el código que sirve el Web App. Sin redespliegue, GAS sigue sirviendo la versión publicada anterior.

Para volver atrás después de un cambio riesgoso:

```powershell
clasp deploy --deploymentId <DEPLOYMENT_ID> --versionNumber 224 -d "rollback"
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
- Credenciales: `admin` con la contraseña de bootstrap. En instalaciones nuevas
  `utils/setupAdmin.gs` **genera una contraseña aleatoria** y la imprime una sola
  vez en el log de ejecución; no hay contraseña por defecto en el repositorio.
  En este entorno la temporal sigue siendo `admin123`.
  **Rotarla en el paso 6.1 antes de abrir el sistema a usuarios reales.**

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
| `npx playwright test e2e/auth.spec.ts` | login real contra el backend | `5 passed`, ~31 s |
| `npx playwright test` | + flujo de creación de servicio | **escribe datos reales** en la Sheet — usar con cuidado |

Chequeo de conectividad al backend, sin tocar datos:

```powershell
$url = (Get-Content .env | Where-Object { $_ -match '^VITE_GAS_WEBAPP_URL=' }) -replace '^VITE_GAS_WEBAPP_URL=',''
Invoke-RestMethod "$url`?action=healthCheck"
# {"success":true,"data":{"status":"ok","version":"1.0.0",...}}
```

`healthCheck` responde aunque el deployment esté viejo: para saber qué código corre, probá una acción nueva (por ejemplo `resetPassword` en el paso 6.2). Si devuelve `error: "Unknown action"`, el Web App no está redesplegado.

---

## 3. Smoke test — bloque operativo (pasos 1–9)

Usar **datos de prueba** con prefijo `TEST-` en notas/proyecto, así se pueden borrar después.
No usar producciones activas: el flujo mueve estados reales y congela breakdowns.

| # | Dónde | Acción | Estado esperado |
|---|---|---|---|
| 1 | `/` | Login `admin` con la contraseña de bootstrap (en este entorno, `admin123`) | entra al dashboard, sin pantalla en blanco |
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

---

## 6. Usuarios y contraseñas

### 6.1 Rotar la contraseña por defecto

1. Entrar a `/user-management` como `admin`.
2. Botón **Change my password** (arriba, al lado de *Create User*).
3. Contraseña actual (la de bootstrap: en este entorno `admin123`), nueva contraseña de al menos 6 caracteres, confirmar.
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

## 9. Si algo falla

1. **F12 → Network**, filtrar por `exec`. Cada llamada lleva `?action=<nombre>` y un body JSON. Esa acción es la que hay que buscar en `Transport Action Unified/api.gs`.
2. **Cold start**: la primera llamada después de un rato puede tardar 3–10 s. El cliente reintenta con backoff; no es un bug.
3. **401 / 403**: token vencido (volver a loguear) o permiso faltante en la matriz de `docs/08-PERMISSIONS.md`.
4. **"Unknown action"**: el frontend está nuevo y el deployment viejo → `clasp push` + redesplegar.
5. **"Transición inválida"**: es correcto, lo lanza `_assertValidTransition`. Revisar `docs/04-STATE_MACHINES.md`.
6. **Pantalla en blanco**: `localStorage.clear()` y recargar; si persiste, mirar `ErrorBoundary` en consola.

Para reportar un fallo sirve: pantalla, acción clickeada, `action` de la request, payload y la respuesta JSON.

---

## 10. Pendientes que esta guía NO cubre

- Mover el token de WhatsApp y los IDs de Sheet a Properties (hoy hay defaults en código).
- Deploy versionado automático por release (hoy es manual y sin tag).
- **Backup del Sheet**: no hay automatización en el repo. Antes de cada release,
  hacer una copia en Drive (`Archivo → Hacer una copia`) o exportar a `.xlsx`.
- Borrar `utils/setupAdmin.gs` del proyecto una vez que el admin existe: hoy
  genera una contraseña aleatoria por instalación, pero el archivo no debería
  quedar vivo en producción.
- Deuda de UI conocida: `ServiceWorkspaceTabs.tsx` (2.846 líneas), 81 `any`, 14 `console.log`.
