# Inbox — dejá acá cualquier cosa

Este es el buzón del proyecto. Tirá un archivo y el agente lo convierte en conocimiento.

## Qué podés dejar

Cualquier formato: PDF, foto del celular, planilla, CSV, JSON, TXT, DOCX, un mail exportado,
una captura de pantalla. No hay que ordenarlo ni renombrarlo. El agente detecta el formato,
extrae el contenido, lo archiva en `raw/` y lo destila en `wiki/`.

## Qué pasa cuando lo dejás

1. El archivo se lee y su contenido se guarda como markdown en `raw/<tema>/`.
2. El original binario se conserva en `raw/<tema>/_originals/`.
3. El conocimiento se compila en una página de `wiki/<tema>/`, enlazada desde `wiki/index.md`.
4. El archivo original se mueve a `inbox/_processed/<fecha>/`.

Nada se borra. Si un archivo no se puede leer, se queda acá con una nota y queda anotado en
`wiki/gaps.md`.

## Cómo se dispara

- Decile al agente: «procesá el inbox» o «sal a pasear».
- O dejalo para el barrido programado, si está configurado.

## Qué NO va acá

- Código, builds, `node_modules`, backups de la base: eso vive en su carpeta y está excluido
  en `02-DOCS/.rscignore`.
- La especificación del ERP: ya está en `docs/` y destilada en `wiki/erp/`. Si querés sumar
  un documento nuevo, dejalo acá igual — el agente decide si es fuente nueva o refuerzo de
  algo que ya existe.
