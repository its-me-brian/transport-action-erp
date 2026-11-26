# Harness decisions

- Accepted plan `d0307f992698a76801ca5ffeab77fb5e832219d6cab951a6039f8ff1add3e9a0`.
- Project kind: software.
- SDD: selected.

## [2026-11-26] dónde vive el corpus del ERP

**Requisito**: que las skills de rsc (`specify`, `plan`, `verify`) encuentren el dominio sin
depender de que alguien lo explique en el chat.

**Opciones**

1. Copiar `docs/` a `02-DOCS/raw/erp/` y destilar desde ahí. Cumple el protocolo al pie de la
   letra, pero crea dos copias de 6.000 líneas que se separan a la primera corrección.
2. Mover `docs/` dentro de `02-DOCS/raw/`. Una sola fuente, pero rompe todos los links de los
   informes de auditoría y de `18-LOCAL-TESTING.md`, y saca el corpus del lugar donde el equipo
   lo busca.
3. Dejar `docs/` como corpus canónico y destilar a mano en `02-DOCS/wiki/erp/` y
   `02-DOCS/wiki/operations/`, citándolo como fuente. Excluir `docs/` del Auto-Ingest Sweep.

**Elegido**: la 3. **Por qué**: la wiki es un modelo, no un espejo; duplicar la especificación
garantiza que una de las dos quede vieja. `02-DOCS/.rscignore` excluye `docs/` para que el sweep
no la copie ni proponga borrarla. Costo aceptado: si `docs/` cambia, la wiki hay que actualizarla
a mano — mitigado porque cada artículo enlaza su fuente.

## [2026-11-26] VAT de prueba en la sociedad emisora

**Requisito**: poder ejercitar el circuito de facturación sin usar un CIF real.

**Opciones**

1. Dejar `OperatingCompany` vacía hasta tener los datos fiscales. Bloquea todo el flujo de
   facturación y el gate `SF001` no se puede probar.
2. Cargar un CIF válido inventado con dígito de control correcto. Parece real; alguien podría
   emitir una factura creyéndola buena.
3. Cargar un identificador que se lea como falso a simple vista.

**Elegido**: la 3 — `00FALSO12135`, con dirección Via San Fernando 7. **Por qué**: el backend no
valida formato de VAT, así que cualquier valor entra; el riesgo no es técnico sino humano. Un
valor que dice «FALSO» no se confunde con uno verdadero. Antes de la primera factura real hay que
reemplazarlo: ver [Flujo del dinero](../erp/money-flow.md).

## [2026-11-26] constitución ratificada desde evidencia

**Requisito**: `verify` corre contra la Definición de Terminado, y la constitución estaba en
borrador con siete secciones vacías.

**Opciones**

1. Dejarla en borrador hasta hacer una sesión de `constitution` con el dueño. Bloquea el primer
   ciclo SDD.
2. Ratificarla con lo que el dueño recuerde en el momento. Rápido, pero inventa la barra de
   calidad.
3. Ratificarla desde lo que ya está escrito y medido: `docs/17-CODING-STANDARDS.md`,
   `docs/15-TESTING.md`, y la corrida de verificación de la primera versión.

**Elegido**: la 3, versión 1.0.0. **Por qué**: cada sección cita de dónde sale (stack real,
792 tests, 252 pasos E2E, 21 invariantes) en lugar de prometer algo que nadie midió. El dueño
puede enmendar; el registro de enmiendas ya está abierto.
