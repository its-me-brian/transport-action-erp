<#
.SYNOPSIS
    Release versionada del backend (Google Apps Script).

.DESCRIPTION
    Hace el ciclo completo de un release y falla ruidosamente si algo no cierra:

      1. Verifica tipos y tests del frontend (salvo -SkipTests).
      2. clasp push            -> sube el codigo al HEAD del proyecto.
      3. clasp version         -> crea una version INMUTABLE con numero.
      4. clasp deploy -i <id>  -> apunta el deployment vivo a esa version.
      5. healthCheck           -> confirma que el Web App responde OK.
      6. Imprime el comando de rollback con la version anterior.

    Por que el mismo deployment ID y no uno nuevo: la URL del Web App no cambia,
    y se conservan los permisos de acceso (los links publicos de chofer necesitan
    "Anyone"). Un deployment nuevo arranca con otra configuracion.

.EXAMPLE
    .\scripts\release.ps1 -Message "v1: rate cards y reconciliacion"

.EXAMPLE
    .\scripts\release.ps1 -Message "hotfix: approveUser role" -SkipTests
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

$Root     = Split-Path -Parent $PSScriptRoot
$Unified  = Join-Path $Root 'Transport Action Unified'
$Frontend = Join-Path $Root 'Transport Action All'
$EnvFile  = Join-Path $Frontend '.env'

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "ERROR: $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------------------
# 0. Preflight: URL y deployment ID
# ---------------------------------------------------------------------------
if (-not (Test-Path $EnvFile)) { Fail "No existe $EnvFile (copia .env.example y pone la URL del Web App)." }

$WebAppUrl = (Get-Content $EnvFile |
    Where-Object { $_ -match '^\s*VITE_GAS_WEBAPP_URL\s*=' } |
    Select-Object -First 1) -replace '^\s*VITE_GAS_WEBAPP_URL\s*=\s*', '' -replace '["'']', ''

if (-not $WebAppUrl) { Fail 'VITE_GAS_WEBAPP_URL vacia en Transport Action All/.env' }

if ($WebAppUrl -notmatch '/macros/s/([^/]+)/exec') {
    Fail "No pude extraer el deployment ID de la URL: $WebAppUrl"
}
$DeploymentId = $Matches[1]

Step "Deployment: $DeploymentId"

# ---------------------------------------------------------------------------
# 1. Version viva (para el rollback)
# ---------------------------------------------------------------------------
$previousVersion = $null
Push-Location $Unified
try {
    $deployments = clasp list-deployments 2>&1
} finally {
    Pop-Location
}

foreach ($line in $deployments) {
    if ($line -match [regex]::Escape($DeploymentId) -and $line -match '@(\d+)') {
        $previousVersion = $Matches[1]
        break
    }
}
if (-not $previousVersion) {
    Write-Host 'AVISO: no pude leer la version viva; el rollback quedara sin numero anterior.' -ForegroundColor Yellow
} else {
    Write-Host "Version viva actual: $previousVersion"
}

# ---------------------------------------------------------------------------
# 2. Gate de calidad
# ---------------------------------------------------------------------------
if (-not $SkipTests) {
    Step 'Typecheck (tsc --noEmit)'
    Push-Location $Frontend
    try {
        npm run lint
        if ($LASTEXITCODE -ne 0) { Fail 'tsc fallo: no se publica.' }

        Step 'Tests (vitest run)'
        npm test
        if ($LASTEXITCODE -ne 0) { Fail 'vitest fallo: no se publica.' }
    } finally {
        Pop-Location
    }
} else {
    Write-Host 'AVISO: -SkipTests, se publica sin correr la suite.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 3. Push + version + deploy
# ---------------------------------------------------------------------------
Push-Location $Unified
try {
    Step 'clasp push'
    clasp push
    if ($LASTEXITCODE -ne 0) { Fail 'clasp push fallo.' }

    Step "clasp version: $Message"
    $versionOut = clasp version $Message 2>&1
    $versionOut | Write-Host
    if ($versionOut -notmatch 'version (\d+)') {
        Fail "No pude parsear el numero de version de la salida de clasp: $versionOut"
    }
    $newVersion = $Matches[1]

    Step "clasp deploy: $DeploymentId @$newVersion"
    clasp deploy -i $DeploymentId -V $newVersion -d $Message
    if ($LASTEXITCODE -ne 0) { Fail 'clasp deploy fallo.' }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 4. Verificacion real contra el Web App
# ---------------------------------------------------------------------------
Step 'healthCheck contra el Web App publicado'
$healthUrl = "$WebAppUrl" + '?action=healthCheck'
try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 90
} catch {
    Fail "healthCheck no respondio: $($_.Exception.Message) -- Rollback: clasp deploy -i $DeploymentId -V $previousVersion"
}

if (-not $health.success) {
    Fail "healthCheck respondio sin success: $($health | ConvertTo-Json -Depth 4)"
}

# ---------------------------------------------------------------------------
# 5. Resumen
# ---------------------------------------------------------------------------
Write-Host "`nRelease OK" -ForegroundColor Green
Write-Host "  Mensaje:    $Message"
Write-Host "  Version:    $newVersion"
Write-Host "  Deployment: $DeploymentId"
Write-Host "  URL:        $WebAppUrl"
Write-Host "  health:     $($health.data.status) / $($health.data.version)"

if ($previousVersion) {
    Write-Host "`nRollback (una linea):" -ForegroundColor Yellow
    Write-Host "  cd '$Unified'; clasp deploy -i $DeploymentId -V $previousVersion -d `"rollback a $previousVersion`""
}
