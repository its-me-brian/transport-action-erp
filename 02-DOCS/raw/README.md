# raw/ — material fuente

Acá vive el material original del que se destila `wiki/`. Es de lectura: se agrega, no se edita.

## Estado actual: vacío a propósito

El corpus fuente del ERP **no está acá**: vive en `docs/`, en la raíz del repo, donde ya estaba
versionado y donde el equipo lo mantiene. Duplicarlo en `raw/` crearía dos verdades que se
separan a la primera corrección.

La decisión está registrada en [decisions.md](../wiki/harness/decisions.md) y el límite de
escaneo en [.rscignore](../.rscignore): `docs/` está excluido del Auto-Ingest Sweep justamente
para que nadie lo copie ni proponga borrarlo.

## Cuándo sí se usa

Cuando entra material nuevo que **no** es la especificación curada: un PDF del cliente, un
contrato, una planilla de tarifas, una captura de WhatsApp. Eso se deja en `inbox/` y el
barrido lo trae acá.
